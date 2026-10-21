/**
 * 视频 HLS 转码模块
 *
 * 目标：原视频**原封不动**留在 uploads 原路径（管理端仍可下载原片），
 * 另外在 uploads/.video/ 下生成一份 HLS 派生资源：
 *
 *   uploads/.video/blog/essay/foo-<版本hash>/
 *     master.m3u8
 *     v0/playlist.m3u8 + seg_00000.ts ...
 *     v1/playlist.m3u8 + seg_00000.ts ...
 *     poster.jpg
 *     meta.json
 *
 * 设计要点：
 * 1. 派生目录带源文件版本号（mtime + size 的 sha1 前 8 位），源文件被覆盖后
 *    URL 自动变化，因此 HLS 分片与 playlists 可以放心加 immutable 长缓存。
 * 2. 转码是异步队列，上传接口只负责落盘 + 入队，不阻塞上传响应；默认并发 1，
 *    用 nice 降优先级，适配 2C/2G 的小机器。
 * 3. ffmpeg/ffprobe 缺失时自动降级：不生成 HLS，原片仍可播放/下载，不影响上传。
 * 4. 前端通过 /media/meta?path=... 拿派生资源；没有 meta 时回退原片。
 *    HLS 文件本身走 /hls/ 前缀（静态、可被 Cloudflare 缓存），/media/* 只放动态接口。
 * 5. 删除原片时一并回收所有版本的派生目录。
 */

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const { spawn, spawnSync } = require("child_process");
const { sourceVersion } = require("./thumbnail");
const { encodeUrlPath, resolveInside, toPosixRelative } = require("./paths");
const { logger } = require("../logger");

const baseUploadDir = path.join(__dirname, "..", "uploads");
const videoRoot = path.join(baseUploadDir, ".video");

/** 注意：不要把 .ts 放进来。代码文件 .ts 在文件管理里很常见，而 MIME 同样是 video/mp2t，
 *  无法可靠区分；MPEG-TS 视频请用 .m2ts/.mts。 */
const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".mpeg",
  ".mpg",
  ".ogv",
  ".m2ts",
  ".mts",
  ".flv",
  ".wmv",
]);

function intEnv(name, fallback) {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

const CONFIG = {
  enabled: !/^(0|false|no)$/i.test(process.env.VIDEO_TRANSCODE_ENABLED || "true"),
  maxHeight: Math.min(2160, Math.max(240, intEnv("VIDEO_HLS_MAX_HEIGHT", 1080))),
  segmentSeconds: Math.min(10, Math.max(2, intEnv("VIDEO_HLS_SEGMENT_SECONDS", 4))),
  concurrency: Math.min(4, Math.max(1, intEnv("VIDEO_TRANSCODE_CONCURRENCY", 1))),
  nice: Math.min(19, Math.max(0, intEnv("VIDEO_TRANSCODE_NICE", 10))),
  timeoutMs: Math.max(60_000, intEnv("VIDEO_TRANSCODE_TIMEOUT_MS", 6 * 60 * 60 * 1000)),
  ffmpeg: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobe: process.env.FFPROBE_PATH || "ffprobe",
  threads: Math.min(4, Math.max(1, intEnv("VIDEO_FFMPEG_THREADS", Math.min(2, os.cpus().length || 2)))),
  maxRate720: Math.max(800, intEnv("VIDEO_HLS_MAXRATE_720", 3200)),
  maxRate1080: Math.max(1200, intEnv("VIDEO_HLS_MAXRATE_1080", 6000)),
  audioBitrate: process.env.VIDEO_HLS_AUDIO_BITRATE || "128k",
};

const PUBLIC_BASE = (process.env.PUBLIC_FILE_BASE_URL || "https://hanphone.top").replace(/\/+$/, "");

let ffmpegOk = false;
let ffprobeOk = false;
let initPromise = null;
let lastInitLogAt = 0;

const jobs = new Map(); // relPath -> job
const queue = [];
let running = 0;

function isVideoFile(nameOrPath) {
  return VIDEO_EXTENSIONS.has(path.extname(String(nameOrPath || "")).toLowerCase());
}

/**
 * 把 /media/meta?path=... 的 path 参数解析成 uploads 内的相对路径。
 * 兼容旧数据里整段编码的 blog%2Fessay/foo.mp4（调用方先 decode 一次）。
 */
function resolveMediaPath(rawPath) {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    const err = new Error("缺少 path 参数");
    err.statusCode = 400;
    throw err;
  }

  const abs = resolveInside(baseUploadDir, rawPath.trim());
  const rel = toPosixRelative(baseUploadDir, abs);

  if (!rel || rel.startsWith("../") || rel.split("/").includes(".video")) {
    const err = new Error("非法的路径");
    err.statusCode = 400;
    throw err;
  }

  return { rel, abs };
}

function versionDir(relPath, version) {
  const relDir = path.posix.dirname(relPath);
  const stem = path.posix.basename(relPath, path.posix.extname(relPath));
  const name = `${stem}-${version}`;
  const rel = relDir === "." ? name : `${relDir}/${name}`;
  return {
    rel,
    abs: path.join(videoRoot, ...rel.split("/")),
    stem,
    parentAbs: path.join(videoRoot, ...(relDir === "." ? [] : relDir.split("/"))),
  };
}

function originalUrl(relPath) {
  return `${PUBLIC_BASE}/${encodeUrlPath(relPath)}`;
}

function downloadUrl(relPath) {
  return `${originalUrl(relPath)}?download=1`;
}

function metaUrl(relPath) {
  return `${PUBLIC_BASE}/media/meta?path=${encodeURIComponent(relPath)}`;
}

function posterUrl(relPath, version) {
  const v = version ? `&v=${encodeURIComponent(version)}` : "";
  return `${PUBLIC_BASE}/media/poster.jpg?path=${encodeURIComponent(relPath)}${v}`;
}

function hlsUrl(relPath, version) {
  const { rel } = versionDir(relPath, version);
  return `${PUBLIC_BASE}/hls/${encodeUrlPath(rel)}/master.m3u8`;
}

function baseMedia(relPath, version) {
  return {
    original: originalUrl(relPath),
    download: downloadUrl(relPath),
    metaUrl: metaUrl(relPath),
    poster: posterUrl(relPath, version),
    hls: null,
    version: version || null,
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

function checkBinary(bin) {
  try {
    const res = spawnSync(bin, ["-version"], { timeout: 5000 });
    return res.status === 0;
  } catch {
    return false;
  }
}

function checkNice() {
  try {
    const res = spawnSync("nice", ["-n", "10", "true"], { timeout: 5000 });
    return res.status === 0;
  } catch {
    return false;
  }
}

async function initVideo() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await fs.mkdir(videoRoot, { recursive: true }).catch((err) => {
      logger.error("创建视频派生目录失败:", { error: err.message });
    });

    if (!CONFIG.enabled) {
      ffmpegOk = false;
      ffprobeOk = false;
      logger.info("视频转码已禁用（VIDEO_TRANSCODE_ENABLED=false），原片仍可访问");
      return;
    }

    [ffmpegOk, ffprobeOk] = [checkBinary(CONFIG.ffmpeg), checkBinary(CONFIG.ffprobe)];

    // nice 缺失时直接跑 ffmpeg，避免转码任务因为一个可选命令全部失败
    if (CONFIG.nice > 0 && !checkNice()) {
      CONFIG.nice = 0;
      logger.warn("nice 不可用，视频转码将不降优先级");
    }

    if (!ffmpegOk || !ffprobeOk) {
      logger.warn("ffmpeg/ffprobe 不可用，视频将只保留原片、不生成 HLS", {
        ffmpeg: CONFIG.ffmpeg,
        ffprobe: CONFIG.ffprobe,
      });
      return;
    }

    const now = Date.now();
    if (now - lastInitLogAt > 5000) {
      lastInitLogAt = now;
      logger.info("视频转码模块就绪", {
        maxHeight: CONFIG.maxHeight,
        segmentSeconds: CONFIG.segmentSeconds,
        concurrency: CONFIG.concurrency,
        threads: CONFIG.threads,
        nice: CONFIG.nice,
      });
    }
  })();

  return initPromise;
}

function ensureInit() {
  if (!initPromise) return initVideo();
  return initPromise;
}

function isAvailable() {
  return CONFIG.enabled && ffmpegOk && ffprobeOk;
}

function publicJob(job) {
  return {
    status: job.status,
    progress: job.progress || 0,
    stage: job.stage || null,
    metaUrl: metaUrl(job.relPath),
    original: originalUrl(job.relPath),
    download: downloadUrl(job.relPath),
    hls: null,
  };
}

/**
 * 把视频加入后台转码队列（同步返回，不等待转码完成）。
 * @param {string} absPath 原片绝对路径
 * @param {string} relPath 相对 uploads 的路径（POSIX）
 * @param {{force?: boolean}} options
 */
function enqueueVideoJob(absPath, relPath, options = {}) {
  if (!isVideoFile(relPath)) return null;

  const existing = jobs.get(relPath);
  if (existing && !options.force && existing.status !== "failed" && existing.status !== "ready") {
    return publicJob(existing);
  }

  const job = {
    absPath,
    relPath,
    force: Boolean(options.force),
    status: "pending",
    progress: 0,
    stage: "queued",
    enqueuedAt: Date.now(),
  };

  jobs.set(relPath, job);
  queue.push(job);
  ensureInit().then(pump).catch((err) => logger.error("视频转码队列启动失败:", { error: err.message }));

  if (!CONFIG.enabled) {
    job.status = "unavailable";
    return publicJob(job);
  }

  return publicJob(job);
}

function pump() {
  if (!isAvailable()) {
    // ffmpeg 不可用：把排队中的任务标记为 unavailable，原片仍可访问
    while (queue.length) {
      const job = queue.shift();
      if (job) {
        job.status = "unavailable";
        job.error = "ffmpeg/ffprobe 不可用";
      }
    }
    return;
  }

  while (running < CONFIG.concurrency && queue.length) {
    const job = queue.shift();
    if (!job) break;
    running += 1;

    (async () => {
      job.status = "processing";
      job.stage = "probe";
      job.startedAt = Date.now();
      try {
        await transcodeVideo(job.absPath, job.relPath, {
          force: job.force,
          onStage: (stage) => {
            job.stage = stage;
          },
          onProgress: (progress) => {
            job.progress = progress;
          },
        });
        job.status = "ready";
        job.progress = 100;
        job.stage = "ready";
      } catch (err) {
        job.status = "failed";
        job.stage = "failed";
        job.error = err.message;
        logger.error("视频转码失败:", { file: job.relPath, error: err.message });
      } finally {
        running -= 1;
        pump();
      }
    })();
  }
}

/** 查询视频派生状态（GET /media/meta 的核心） */
async function getVideoMedia(relPath, absPath) {
  const abs = absPath || resolveMediaPath(relPath).abs;
  const rel = relPath || toPosixRelative(baseUploadDir, abs);

  if (!isVideoFile(rel)) return null;

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    stat = null;
  }
  if (!stat || !stat.isFile()) {
    const err = new Error("文件不存在");
    err.statusCode = 404;
    throw err;
  }

  let version = null;
  try {
    version = await sourceVersion(abs);
  } catch {
    version = null;
  }

  const base = baseMedia(rel, version);
  if (!version) return { ...base, status: "failed", error: "无法读取源文件信息" };

  const dirs = versionDir(rel, version);
  const meta = await readJson(path.join(dirs.abs, "meta.json"));

  if (meta && meta.status === "ready") {
    return {
      ...base,
      status: "ready",
      duration: meta.duration || null,
      width: meta.width || null,
      height: meta.height || null,
      hls: hlsUrl(rel, version),
      renditions: (meta.renditions || []).map((r) => ({
        height: r.height,
        width: r.width,
        bandwidth: r.bandwidth,
        playlist: `${PUBLIC_BASE}/hls/${encodeUrlPath(path.posix.join(dirs.rel, r.dir, "playlist.m3u8"))}`,
      })),
    };
  }

  const job = jobs.get(rel);
  if (job && (job.status === "pending" || job.status === "processing")) {
    return {
      ...base,
      status: job.status,
      progress: job.progress || 0,
      stage: job.stage || null,
    };
  }

  const status = await readJson(path.join(dirs.abs, "status.json"));
  if (status) {
    const startedAt = Number(status.startedAt) || 0;
    const stale = status.status === "processing" && startedAt && Date.now() - startedAt > CONFIG.timeoutMs;
    return {
      ...base,
      status: stale ? "failed" : status.status || "processing",
      progress: status.progress || 0,
      stage: status.stage || null,
      error: stale ? "转码超时中断，可重新触发" : status.error || null,
    };
  }

  return { ...base, status: "none" };
}

/** 海报绝对路径；没有生成过则返回 null */
async function getVideoPoster(relPath, absPath) {
  const abs = absPath || resolveMediaPath(relPath).abs;
  const rel = relPath || toPosixRelative(baseUploadDir, abs);
  if (!isVideoFile(rel)) return null;

  const version = await sourceVersion(abs).catch(() => null);
  if (!version) return null;

  const dirs = versionDir(rel, version);
  const meta = await readJson(path.join(dirs.abs, "meta.json"));
  if (!meta || meta.status !== "ready" || !meta.poster) return null;

  const poster = path.join(dirs.abs, meta.poster);
  return fsSync.existsSync(poster) ? poster : null;
}

/** 单个源文件的版本目录（测试/脚本用） */
function getVersionDir(relPath, version) {
  return versionDir(relPath, version);
}

// ---------------------------------------------------------------------------
// ffprobe / ffmpeg
// ---------------------------------------------------------------------------

function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(cmd)} exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

function parseFps(value) {
  if (!value || typeof value !== "string") return 25;
  const [num, den] = value.split("/").map(Number);
  if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return num / den;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

function normalizeRotation(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return 0;
  return ((Math.round(n) % 360) + 360) % 360;
}

async function probe(absPath) {
  const raw = await runCapture(CONFIG.ffprobe, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    absPath,
  ]);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("ffprobe 返回了无法解析的 JSON");
  }

  const streams = data.streams || [];
  const video = streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  if (!video) throw new Error("文件中没有可转码的视频流");

  const audio = streams.find((s) => s.codec_type === "audio");
  const rotation = normalizeRotation(
    video.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? video.tags?.rotate
  );

  let width = Number(video.width) || 0;
  let height = Number(video.height) || 0;
  if (!width || !height) throw new Error("无法读取视频分辨率");
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];

  const duration = Number.parseFloat(data.format?.duration || video.duration || "0") || 0;
  if (!duration || duration < 0.1) throw new Error("视频时长无效，无法切片");

  return {
    duration,
    width,
    height,
    rotation,
    fps: parseFps(video.r_frame_rate || video.avg_frame_rate),
    hasAudio: Boolean(audio),
    codec: video.codec_name || null,
  };
}

/**
 * 根据源分辨率和上限计算 HLS 档位（短边）。
 * 1920x1080 → [1080, 720]；1280x720 → [720]；640x360 → [360]；
 * 竖屏 1080x1920 → [1080, 720]（按短边即宽度算）。
 */
function planRenditions(width, height, maxHeight = CONFIG.maxHeight) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w < 2 || h < 2) return [];

  const shortSide = Math.min(w, h);
  let candidates;
  if (maxHeight >= 1080) candidates = [1080, 720];
  else if (maxHeight >= 720) candidates = [720];
  else candidates = [maxHeight];

  let levels = candidates.filter((level) => level <= shortSide && level <= maxHeight);
  if (!levels.length) {
    // 源片比最低档还小：按源片短边转一档，不放大
    levels = [Math.max(2, Math.floor(shortSide / 2) * 2)];
  }

  return [...new Set(levels)].sort((a, b) => b - a);
}

/** 档位 → 输出宽高（保持比例，宽高都取偶数） */
function outputSize(width, height, level) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const portrait = h > w;

  let outW;
  let outH;
  if (portrait) {
    outW = level;
    outH = (level * h) / w;
  } else {
    outH = level;
    outW = (level * w) / h;
  }

  outW = Math.max(2, Math.round(outW / 2) * 2);
  outH = Math.max(2, Math.round(outH / 2) * 2);
  return { width: outW, height: outH };
}

function bandwidthFor(level) {
  const videoKbps =
    level >= 1080
      ? CONFIG.maxRate1080
      : level >= 720
        ? CONFIG.maxRate720
        : Math.max(600, Math.round(CONFIG.maxRate720 * 0.5));
  // HLS 规范要求是峰值带宽上界；留 10% 余量 + 音频
  return Math.round(videoKbps * 1000 * 1.1 + 128_000);
}

function runFfmpeg(args, onProgress) {
  return new Promise((resolve, reject) => {
    const useNice = CONFIG.nice > 0;
    const cmd = useNice ? "nice" : CONFIG.ffmpeg;
    const cmdArgs = useNice ? ["-n", String(CONFIG.nice), CONFIG.ffmpeg, ...args] : args;

    const child = spawn(cmd, cmdArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdoutBuf = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg 超时（${Math.round(CONFIG.timeoutMs / 1000)}s）`));
    }, CONFIG.timeoutMs);
    if (typeof timer.unref === "function") timer.unref();

    child.stdout.on("data", (chunk) => {
      stdoutBuf += chunk.toString();
      let idx;
      while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (!line) continue;
        const [key, value] = line.split("=", 2);
        if (key === "out_time_us" || key === "out_time_ms") {
          const us = Number(value);
          if (Number.isFinite(us)) onProgress?.(us / 1_000_000);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });

    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

function buildVariantArgs(input, variantDir, size, info) {
  const gop = Math.max(1, Math.round((info.fps || 25) * CONFIG.segmentSeconds));
  const shortSide = Math.min(size.width, size.height);
  const maxRate =
    shortSide >= 1080
      ? CONFIG.maxRate1080
      : shortSide >= 720
        ? CONFIG.maxRate720
        : Math.max(600, Math.round(CONFIG.maxRate720 * 0.5));

  const args = [
    "-hide_banner",
    "-y",
    "-loglevel",
    "error",
    "-i",
    input,
    "-map",
    "0:v:0",
    ...(info.hasAudio ? ["-map", "0:a:0"] : []),
    "-sn",
    "-dn",
    "-vf",
    `scale=${size.width}:${size.height}:flags=lanczos,setsar=1`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-profile:v",
    "main",
    "-pix_fmt",
    "yuv420p",
    "-threads",
    String(CONFIG.threads),
    "-maxrate",
    `${maxRate}k`,
    "-bufsize",
    `${maxRate * 2}k`,
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-force_key_frames",
    `expr:gte(t,n_forced*${CONFIG.segmentSeconds})`,
  ];

  if (info.hasAudio) {
    args.push("-c:a", "aac", "-b:a", CONFIG.audioBitrate, "-ac", "2");
  } else {
    args.push("-an");
  }

  args.push(
    "-f",
    "hls",
    "-hls_time",
    String(CONFIG.segmentSeconds),
    "-hls_playlist_type",
    "vod",
    "-hls_list_size",
    "0",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(variantDir, "seg_%05d.ts"),
    "-progress",
    "pipe:1",
    "-nostats",
    path.join(variantDir, "playlist.m3u8")
  );

  return args;
}

async function makePoster(input, outAbs, info) {
  const seek = Math.min(1, Math.max(0, info.duration / 3));
  await runFfmpeg([
    "-hide_banner",
    "-y",
    "-loglevel",
    "error",
    "-ss",
    String(seek),
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    "scale=1280:1280:force_original_aspect_ratio=decrease",
    "-q:v",
    "3",
    "-progress",
    "pipe:1",
    "-nostats",
    outAbs,
  ]);
}

function buildMasterPlaylist(renditions) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS", ""];
  for (const r of renditions) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height}`
    );
    lines.push(`${r.dir}/playlist.m3u8`);
  }
  return lines.join("\n") + "\n";
}

async function cleanupOtherVersions(relPath, keepAbs) {
  const relDir = path.posix.dirname(relPath);
  const stem = path.posix.basename(relPath, path.posix.extname(relPath));
  const parent = path.join(videoRoot, ...(relDir === "." ? [] : relDir.split("/")));

  let entries;
  try {
    entries = await fs.readdir(parent, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${stem}-`)) continue;
    const abs = path.join(parent, entry.name);
    if (path.resolve(abs) === path.resolve(keepAbs)) continue;
    await fs.rm(abs, { recursive: true, force: true }).catch((err) => {
      logger.warn("清理旧视频派生目录失败:", { dir: abs, error: err.message });
    });
  }
}

/**
 * 真正的转码流程。可被上传队列、回填脚本直接调用。
 * @returns {Promise<object>} meta.json 内容
 */
async function transcodeVideo(absPath, relPath, options = {}) {
  await ensureInit();
  if (!isAvailable()) throw new Error("ffmpeg/ffprobe 不可用，无法转码");
  if (!isVideoFile(relPath)) throw new Error("不是视频文件");

  // 防御性校验：只接受 uploads 内的相对路径，派生目录不能越界 / 不能写进 .video 自身
  const safeAbs = resolveInside(baseUploadDir, relPath);
  const normalizedRel = toPosixRelative(baseUploadDir, safeAbs);
  if (
    !normalizedRel ||
    normalizedRel.startsWith("../") ||
    normalizedRel.split("/").includes(".video")
  ) {
    throw new Error("非法的视频路径");
  }
  absPath = safeAbs;
  relPath = normalizedRel;

  const stat = await fs.stat(absPath);
  if (!stat.isFile()) throw new Error("源文件不是普通文件");

  const version = await sourceVersion(absPath);
  const dirs = versionDir(relPath, version);
  const metaPath = path.join(dirs.abs, "meta.json");
  const statusPath = path.join(dirs.abs, "status.json");

  if (!options.force && fsSync.existsSync(metaPath)) {
    const existing = await readJson(metaPath);
    if (existing && existing.status === "ready") return existing;
  }

  // 强制重转时先摘掉旧 meta：避免转码过程中继续对外提供“旧 playlists + 新分片”的混合状态
  if (options.force) {
    await fs.unlink(metaPath).catch(() => {});
  }

  await fs.mkdir(dirs.abs, { recursive: true });

  const status = {
    status: "processing",
    stage: "probe",
    progress: 0,
    source: relPath,
    version,
    startedAt: Date.now(),
  };
  await writeJson(statusPath, status);

  let info;
  let renditions = [];

  try {
    options.onStage?.("probe");
    info = await probe(absPath);

    const levels = planRenditions(info.width, info.height, CONFIG.maxHeight);
    if (!levels.length) throw new Error("无法计算转码档位");

    for (let i = 0; i < levels.length; i += 1) {
      const level = levels[i];
      const dirName = `v${i}`;
      const variantDir = path.join(dirs.abs, dirName);
      await fs.mkdir(variantDir, { recursive: true });

      const size = outputSize(info.width, info.height, level);
      status.stage = "transcoding";
      status.level = level;
      status.renditionIndex = i;
      status.renditionTotal = levels.length;
      status.progress = Math.round((i / levels.length) * 100);
      await writeJson(statusPath, status).catch(() => {});
      options.onStage?.("transcoding");

      await runFfmpeg(buildVariantArgs(absPath, variantDir, size, info), (seconds) => {
        const current = Math.min(1, Math.max(0, seconds / info.duration));
        const progress = Math.round(((i + current) / levels.length) * 100);
        status.progress = progress;
        options.onProgress?.(progress);
      });

      renditions.push({
        // 注意：level 是「短边」档位；竖屏时实际输出高度不是 level，必须用 size
        height: size.height,
        width: size.width,
        bandwidth: bandwidthFor(level),
        dir: dirName,
      });
    }

    status.stage = "poster";
    status.progress = 95;
    await writeJson(statusPath, status).catch(() => {});
    options.onStage?.("poster");

    let poster = null;
    try {
      await makePoster(absPath, path.join(dirs.abs, "poster.jpg"), info);
      poster = "poster.jpg";
    } catch (err) {
      // 海报失败不影响 HLS 播放
      logger.warn("生成视频海报失败:", { file: relPath, error: err.message });
    }

    status.stage = "packaging";
    status.progress = 98;
    await writeJson(statusPath, status).catch(() => {});

    const master = buildMasterPlaylist(renditions);
    await fs.writeFile(path.join(dirs.abs, "master.m3u8"), master);

    const meta = {
      status: "ready",
      version,
      source: relPath,
      duration: info.duration,
      width: info.width,
      height: info.height,
      fps: info.fps,
      hasAudio: info.hasAudio,
      poster,
      renditions,
      createdAt: new Date().toISOString(),
      finishedAt: Date.now(),
    };

    await writeJson(metaPath, meta);
    await fs.unlink(statusPath).catch(() => {});
    await cleanupOtherVersions(relPath, dirs.abs);

    return meta;
  } catch (err) {
    const failed = {
      ...status,
      status: "failed",
      stage: "failed",
      error: err.message,
      finishedAt: Date.now(),
    };
    await writeJson(statusPath, failed).catch(() => {});
    throw err;
  }
}

/**
 * 删除某个原片的所有派生版本（删原片时调用）。
 * @returns {Promise<number>} 删除的版本目录数
 */
async function deleteVideoAssets(absPath) {
  if (!isVideoFile(absPath)) return 0;

  const rel = toPosixRelative(baseUploadDir, absPath);
  if (!rel || rel.startsWith("../")) return 0;

  const relDir = path.posix.dirname(rel);
  const stem = path.posix.basename(rel, path.posix.extname(rel));
  const parent = path.join(videoRoot, ...(relDir === "." ? [] : relDir.split("/")));

  let entries;
  try {
    entries = await fs.readdir(parent, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${stem}-`)) continue;
    try {
      await fs.rm(path.join(parent, entry.name), { recursive: true, force: true });
      count += 1;
    } catch (err) {
      logger.warn("删除视频派生目录失败:", { dir: entry.name, error: err.message });
    }
  }

  // 顺手清掉空的命名空间目录
  await fs.rmdir(parent).catch(() => {});
  return count;
}

/** 删除整个目录对应的派生资源（递归删目录时调用） */
async function deleteVideoNamespace(relDir) {
  if (!relDir) return 0;
  const abs = resolveInside(videoRoot, relDir);
  try {
    await fs.rm(abs, { recursive: true, force: true });
    return 1;
  } catch (err) {
    logger.warn("删除视频派生命名空间失败:", { dir: relDir, error: err.message });
    return 0;
  }
}

/** 测试/脚本用 */
function getConfig() {
  return { ...CONFIG, videoRoot, baseUploadDir, publicBase: PUBLIC_BASE };
}

module.exports = {
  CONFIG,
  PUBLIC_BASE,
  baseUploadDir,
  videoRoot,
  isVideoFile,
  resolveMediaPath,
  initVideo,
  ensureInit,
  isAvailable,
  enqueueVideoJob,
  getVideoMedia,
  getVideoPoster,
  transcodeVideo,
  deleteVideoAssets,
  deleteVideoNamespace,
  planRenditions,
  outputSize,
  versionDir: getVersionDir,
  getVersionDir,
  getConfig,
};
