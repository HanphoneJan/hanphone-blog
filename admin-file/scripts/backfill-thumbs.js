#!/usr/bin/env node
/**
 * 照片墙 / 随笔 历史图片缩略图回填脚本
 *
 * 用途：为数据库里已有的图片生成多档 WebP 缩略图，并回填 width / height / thumb_path。
 * 缩略图生成逻辑与上传时完全一致（复用 lib/thumbnail.js），保证新老图片 URL 规则一致。
 *
 * 用法（在部署机 ~/server_file 下执行）：
 *   node scripts/backfill-thumbs.js --env /home/hanphone/server_atlas/.env [--dry-run] [--force] [--target essay]
 *
 * 参数：
 *   --env <path>       读取服务端 .env 取数据库连接参数（Spring Boot 用 PG_*，photo-wall-server 用 DB_*）
 *   --dry-run          不写数据库（缩略图文件仍会生成，便于核对尺寸/体积/命名）
 *   --target <name>    atlas（默认，照片墙 atlas_files）| essay（随笔 t_essay_url）
 *   --only-missing     跳过数据库里已有 thumb_path 的记录（默认行为）
 *   --force            不跳过已有 thumb_path 的记录（源文件变更时重新生成）
 *
 * 幂等：缩略图文件名带源文件版本号（mtime+size 哈希），重复执行不会重复生成。
 *      若源文件被覆盖，版本号变化 → 生成新文件名的缩略图 → 新 URL → 缓存自动失效。
 */

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const { generateThumbnails } = require("../lib/thumbnail");

const baseUploadDir = path.join(__dirname, "..", "uploads");

/** 目标表定义：随笔表没有 type 列，过滤条件留空 */
const TARGETS = {
  atlas: {
    label: "照片墙 atlas_files",
    table: "public.atlas_files",
    select: "SELECT id, path, thumb_path FROM public.atlas_files ${where} ORDER BY id",
    update:
      "UPDATE public.atlas_files SET width = $1, height = $2, thumb_path = $3 WHERE id = $4",
  },
  essay: {
    label: "随笔 t_essay_url",
    table: "public.t_essay_url",
    // 随笔附件含图片/视频/文档，只处理本站托管的图片附件；外链没有缩略图可言
    select:
      "SELECT id, url AS path, thumb_path FROM public.t_essay_url " +
      "${where} AND url_type = 'IMAGE' ORDER BY id",
    update:
      "UPDATE public.t_essay_url SET width = $1, height = $2, thumb_path = $3 WHERE id = $4",
  },
};

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { dryRun: false, onlyMissing: true, envPath: null, target: "atlas" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true; // 仅跳过数据库写入；缩略图文件照常生成，方便核对产物
    else if (a === "--only-missing") args.onlyMissing = true;
    else if (a === "--force") args.onlyMissing = false;
    else if (a === "--env") args.envPath = argv[++i];
    else if (a === "--target") args.target = argv[++i];
  }
  return args;
}

// ---------------------------------------------------------------------------
// 读取 .env（容忍 "PORT = 4001" 这种带空格的写法）
// ---------------------------------------------------------------------------
function readEnvFile(envPath) {
  const raw = fsSync.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * 从 .env 解析数据库连接参数，兼容两套变量名：
 *   Spring Boot（server_blog/.env）: PG_HOST / PG_USERNAME / PG_PASSWORD / 库名固定 blog
 *   photo-wall-server（server_atlas/.env）: DB_HOST / DB_USER / DB_PASSWORD / DB_NAME
 */
function readDbConfig(env) {
  return {
    host: env.DB_HOST || env.PG_HOST || "localhost",
    port: Number(env.DB_PORT || env.PG_PORT || 5432),
    user: env.DB_USER || env.PG_USERNAME,
    password: env.DB_PASSWORD || env.PG_PASSWORD,
    database: env.DB_NAME || "blog",
  };
}

// ---------------------------------------------------------------------------
// URL → 磁盘相对路径
//
// 现网 DB 里存在两种 URL 形态（都能正常访问）：
//   https://hanphone.top/blog/atlas/xxx.jpg          （旧数据，按 / 分段）
//   https://hanphone.top/blog%2Fatlas/%E9%81%90...png （新数据，整串编码过 /）
// 统一走 decodeURIComponent 后归一化成 blog/atlas/xxx.png
// ---------------------------------------------------------------------------
function urlToRelPath(rawUrl) {
  let pathname;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }

  const rel = decoded.replace(/^\/+/, "");
  if (!rel) return null;

  // 路径穿越校验
  const resolved = path.resolve(baseUploadDir, rel);
  if (!resolved.startsWith(path.resolve(baseUploadDir) + path.sep)) return null;
  return { rel, abs: resolved };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.envPath) {
    console.error("缺少 --env <photo-wall-server/.env 路径>");
    process.exit(1);
  }

  const env = readEnvFile(args.envPath);
  const dbConfig = readDbConfig(env);
  if (!dbConfig.user || !dbConfig.password) {
    console.error(".env 中缺少数据库用户名/密码（DB_* 或 PG_*）");
    process.exit(1);
  }

  const target = TARGETS[args.target];
  if (!target) {
    console.error(`未知的 --target "${args.target}"，可选：${Object.keys(TARGETS).join(" | ")}`);
    process.exit(1);
  }

  // pg 只在运行本脚本时加载，不影响 admin-file 主服务
  let pg;
  try {
    pg = require("pg");
  } catch {
    console.error("缺少依赖 pg，请先执行: npm i -D pg");
    process.exit(1);
  }

  const client = new pg.Client(dbConfig);
  await client.connect();

  console.log(`数据库: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`目标表: ${target.label} (${target.table})`);

  // 1. 确保字段存在
  console.log("\n[1/3] 确保表结构...");
  if (args.target === "atlas") {
    await client.query(`
      ALTER TABLE public.atlas_files
        ADD COLUMN IF NOT EXISTS width integer,
        ADD COLUMN IF NOT EXISTS height integer,
        ADD COLUMN IF NOT EXISTS thumb_path character varying(512)
    `);
    await client.query(
      `ALTER TABLE public.atlas_files ALTER COLUMN path TYPE character varying(512)`
    );
  } else {
    await client.query(`
      ALTER TABLE public.t_essay_url
        ADD COLUMN IF NOT EXISTS width integer,
        ADD COLUMN IF NOT EXISTS height integer,
        ADD COLUMN IF NOT EXISTS thumb_path character varying(512)
    `);
  }

  // 2. 读取待处理记录
  const where = args.onlyMissing ? "WHERE thumb_path IS NULL" : "";
  const filter = args.onlyMissing
    ? target.select.replace("${where}", `WHERE thumb_path IS NULL`)
    : target.select.replace("${where}", "");
  console.log(`\n[2/3] 读取记录 (${where || "全部"})...`);
  const { rows } = await client.query(filter);
  console.log(`      共 ${rows.length} 条待处理`);

  if (rows.length === 0) {
    await client.end();
    console.log("\n完成，无需处理。");
    return;
  }

  // 3. 逐条生成
  console.log(`\n[3/3] 生成缩略图${args.dryRun ? "（dry-run，不写数据库）" : ""}...`);
  const stats = { ok: 0, skipped: 0, failed: 0 };
  const encode = (rel) =>
    rel
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/");

  for (const row of rows) {
    const mapped = urlToRelPath(row.path);
    const label = `id=${String(row.id).padStart(3)} ${path.basename(row.path)}`;

    if (!mapped) {
      console.log(`  ✗ ${label} → URL 无法解析或路径穿越，已跳过`);
      stats.failed++;
      continue;
    }

    // 原图不存在（孤儿记录）
    try {
      await fs.access(mapped.abs);
    } catch {
      console.log(`  ✗ ${label} → 磁盘文件不存在: ${mapped.rel}`);
      stats.failed++;
      continue;
    }

    const { width, height, thumbs } = await generateThumbnails(
      mapped.abs,
      mapped.rel
    );

    if (!width) {
      console.log(`  · ${label} → 非图片/无法解码，跳过`);
      stats.skipped++;
      continue;
    }

    // 列表页默认缩略图：800w，回退 320w
    const thumbRel = thumbs["800"] || thumbs["320"] || null;
    const thumbPath = thumbRel
      ? `https://hanphone.top/${encode(thumbRel)}`
      : null;
    const widths = Object.keys(thumbs)
      .filter((k) => thumbs[k])
      .join(",");

    if (!thumbPath) {
      console.log(`  · ${label} → ${width}×${height}，原图已小于最窄档位，不生成缩略图`);
      stats.skipped++;
    } else {
      console.log(`  ✓ ${label} → ${width}×${height}  档位[${widths}]`);
    }

    if (!args.dryRun) {
      await client.query(target.update, [width, height, thumbPath, row.id]);
    }
    stats.ok++;
  }

  await client.end();

  console.log(
    `\n完成：成功 ${stats.ok}，跳过 ${stats.skipped}，失败 ${stats.failed}` +
      (args.dryRun ? "（dry-run，未写入任何数据）" : "")
  );
}

main().catch((err) => {
  console.error("回填失败:", err);
  process.exit(1);
});