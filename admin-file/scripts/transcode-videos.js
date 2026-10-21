#!/usr/bin/env node
/**
 * 历史视频 HLS 回填脚本
 *
 * 原片始终保留在 uploads 原路径，脚本只补 uploads/.video/ 下的派生资源：
 *   master.m3u8 / v0,v1 分片 / poster.jpg / meta.json
 *
 * 用法（部署机 ~/server_file 下）：
 *   node scripts/transcode-videos.js --env /home/hanphone/server_file/.env --dry-run
 *   node scripts/transcode-videos.js --env /home/hanphone/server_file/.env
 *   node scripts/transcode-videos.js --path blog/essay/foo.mp4 --force
 *
 * 参数：
 *   --env <path>        读取 .env（PUBLIC_FILE_BASE_URL / 转码参数等）
 *   --path <path>       只处理某个文件或某个目录前缀（相对 uploads）
 *   --force             已生成过也重新转码
 *   --dry-run           只打印计划，不转码
 *   --max-height <n>    覆盖 VIDEO_HLS_MAX_HEIGHT（720/1080）
 *   --help              显示帮助
 *
 * 转码是串行的；2C/2G 机器上更长的视频会跑很久，建议放在低峰期，或用 nohup 后台跑。
 */

const path = require("path");
const fs = require("fs/promises");

function parseArgs(argv) {
  const args = {
    envPath: null,
    filter: null,
    force: false,
    dryRun: false,
    maxHeight: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--env") args.envPath = argv[++i];
    else if (a === "--path") args.filter = argv[++i];
    else if (a === "--force") args.force = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--max-height") args.maxHeight = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`用法: node scripts/transcode-videos.js [选项]

  --env <path>        读取 .env
  --path <path>       只处理指定文件/目录前缀（相对 uploads）
  --force             已生成过也重新转码
  --dry-run           只打印计划
  --max-height <n>    覆盖最高档位（720/1080）
  --help              显示帮助`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.envPath) {
  require("dotenv").config({ path: path.resolve(args.envPath) });
}
if (args.maxHeight) {
  process.env.VIDEO_HLS_MAX_HEIGHT = String(args.maxHeight);
}

const {
  initVideo,
  isAvailable,
  isVideoFile,
  transcodeVideo,
  getVideoMedia,
  getConfig,
} = require("../lib/video");

const { baseUploadDir } = getConfig();

async function collectVideos(dir, relDir = "") {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    // 派生目录、临时上传目录和隐藏目录不参与
    if (
      entry.name === ".video" ||
      entry.name === "temp" ||
      entry.name === ".gitkeep" ||
      entry.name.startsWith(".")
    ) {
      continue;
    }

    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...(await collectVideos(abs, rel)));
    } else if (entry.isFile() && isVideoFile(rel)) {
      out.push({ rel, abs });
    }
  }

  return out;
}

function matchesFilter(rel) {
  if (!args.filter) return true;
  const f = args.filter.replace(/^\/+/, "").replace(/\\/g, "/");
  return rel === f || rel.startsWith(`${f}/`);
}

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m${s % 60}s`;
}

(async () => {
  await initVideo();

  if (!isAvailable()) {
    console.error("ffmpeg/ffprobe 不可用（或 VIDEO_TRANSCODE_ENABLED=false），无法转码。");
    process.exit(1);
  }

  const all = await collectVideos(baseUploadDir);
  const targets = all.filter((v) => matchesFilter(v.rel)).sort((a, b) => a.rel.localeCompare(b.rel));

  console.log(`发现视频 ${all.length} 个，本次匹配 ${targets.length} 个`);
  if (!targets.length) return;

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const startedAll = Date.now();

  for (const target of targets) {
    const started = Date.now();

    if (!args.force) {
      const media = await getVideoMedia(target.rel, target.abs).catch(() => null);
      if (media && media.status === "ready") {
        skipped += 1;
        console.log(`[skip] ${target.rel}（已有 HLS）`);
        continue;
      }
      if (args.dryRun) {
        console.log(`[plan] ${target.rel}（当前状态: ${media?.status || "none"}）`);
        continue;
      }
    } else if (args.dryRun) {
      console.log(`[plan] ${target.rel}（--force）`);
      continue;
    }

    console.log(`[start] ${target.rel}`);
    let lastPercent = -1;

    try {
      await transcodeVideo(target.abs, target.rel, {
        force: args.force,
        onStage: (stage) => {
          if (stage !== "transcoding") console.log(`  ${stage}`);
        },
        onProgress: (percent) => {
          if (percent >= lastPercent + 10 || percent === 100) {
            lastPercent = percent;
            process.stdout.write(`  ${percent}%\n`);
          }
        },
      });
      processed += 1;
      console.log(`[done] ${target.rel}（${formatDuration(Date.now() - started)}）`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${target.rel}: ${err.message}`);
    }
  }

  console.log(
    `\n完成：转码 ${processed}，跳过 ${skipped}，失败 ${failed}，总耗时 ${formatDuration(
      Date.now() - startedAll
    )}`
  );

  if (failed > 0) process.exitCode = 1;
})().catch((err) => {
  console.error("脚本异常:", err);
  process.exit(1);
});
