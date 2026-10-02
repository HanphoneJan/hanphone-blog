/**
 * 缩略图生成模块
 *
 * 背景：照片墙直接展示上传的「原图」（单张最大 1GB），列表页一次进入就要拉几十 MB，
 * 在 2C/2G 的机器上必然出现加载失败/超时。这里在上传时按宽度生成多档 WebP 缩略图，
 * 原图保留（预览/下载仍用原图），列表页只请求缩略图。
 *
 * 设计要点：
 * 1. 缩略图文件名带「源文件版本号」（mtime+size 的哈希），内容变化即文件名变化，
 *    因此可以安全地给缩略图加 immutable 长期缓存。
 * 2. 低于目标宽度的不生成（原图已足够小），由调用方回退到原图。
 * 3. 生产机只有 2 核，限制 sharp 的 libuv 线程池与内存缓存，避免上传时抢占整机资源。
 */

const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

/**
 * sharp 延迟加载。
 *
 * 生产机只有 2C/2G（总内存 1.9GB，可用约 600MB），而 sharp 会把 libvips 静态链进
 * 进程，实测常驻内存多占约 30MB。文件服务绝大多数请求只是 stat/读写，
 * 因此这里等真正要处理图片时再 require，静态托管路径不为此买单。
 */
let sharpModule = null;
function getSharp() {
  if (sharpModule) return sharpModule;

  const sharp = require("sharp");
  // 生产机 2 核：把 libuv 线程池限制为 2，避免单个上传任务打满 CPU
  sharp.concurrency(2);
  // 限制 libvips 缓存：0 个文件句柄 + 64MB 内存上限
  sharp.cache({ files: 0, items: 50, memory: 64 });

  sharpModule = sharp;
  return sharp;
}

/** 需要生成缩略图的扩展名（其余格式保持原样直出） */
const THUMBNAILABLE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
]);

/** 缩略图档位宽度（px），由小到大 */
const THUMB_WIDTHS = [320, 800, 1600];

/** WebP 编码质量与 CPU 开销的折中值 */
const WEBP_QUALITY = 80;
const WEBP_EFFORT = 4;

/** 单个像素上限，防止超大图（如 12000×8000  panoramas）把内存打爆 */
const MAX_INPUT_PIXELS = 268402689; // 16384 × 16384

/**
 * 计算源文件的「版本号」：mtime + size 的短哈希。
 * 源文件被覆盖/重命名后版本号变化 → 缩略图 URL 变化 → 缓存自动失效。
 */
async function sourceVersion(absPath) {
  const stat = await fs.stat(absPath);
  const raw = `${stat.mtimeMs}-${stat.size}`;
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 8);
}

/**
 * 生成缩略图文件名，例如：遐蝶2-800w.a1b2c3d4.webp
 * @param {string} originalName 原文件名（含扩展名）
 * @param {number} width 目标宽度
 * @param {string} version 源文件版本号
 */
function thumbFileName(originalName, width, version) {
  const ext = path.extname(originalName);
  const stem = path.basename(originalName, ext);
  return `${stem}-${width}w.${version}.webp`;
}

/**
 * 读取图片尺寸，并按 EXIF Orientation 修正宽高。
 * Orientation 5-8 表示旋转了 90°/270°，宽高需要互换。
 */
async function readImageSize(absPath) {
  const meta = await getSharp()(absPath, {
    failOn: "none",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();

  let { width, height } = meta;
  if (!width || !height) return null;
  if (meta.orientation >= 5 && meta.orientation <= 8) {
    [width, height] = [height, width];
  }
  return { width, height };
}

/**
 * 为一张已落盘的文件生成缩略图。
 *
 * @param {string} absPath 源文件绝对路径
 * @param {string} relPath 源文件相对 baseUploadDir 的路径（用于拼缩略图输出目录）
 * @returns {Promise<{width:number|null, height:number|null, thumbs:Record<string,string>}>}
 *          thumbs 的 key 是宽度字符串，value 是**未编码**的相对路径（形如 blog/atlas/xxx-320w.ab12cd34.webp）
 *          调用方负责按 / 分段 URL 编码后加上域名。
 */
async function generateThumbnails(absPath, relPath) {
  const ext = path.extname(absPath).toLowerCase();
  const result = { width: null, height: null, thumbs: {} };

  if (!THUMBNAILABLE_EXTENSIONS.has(ext)) return result;

  let version;
  try {
    version = await sourceVersion(absPath);
  } catch (err) {
    return result;
  }

  let size;
  try {
    size = await readImageSize(absPath);
  } catch (err) {
    // 解码失败（损坏 / 伪图片）时静默跳过，不影响原图上传
    return result;
  }
  if (!size) return result;

  result.width = size.width;
  result.height = size.height;

  const outDir = path.dirname(absPath);
  const relDir = path.dirname(relPath);
  const originalName = path.basename(absPath);

  for (const targetWidth of THUMB_WIDTHS) {
    // 目标宽度不小于原图宽度时不生成，避免无意义的放大
    if (targetWidth >= size.width) continue;

    const fileName = thumbFileName(originalName, targetWidth, version);
    const outAbs = path.join(outDir, fileName);
    const outRel = relDir ? `${relDir}/${fileName}` : fileName;

    try {
      await getSharp()(absPath, {
        failOn: "none",
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate() // 依 EXIF 自动摆正（必须在 resize 之前，sharp 内部顺序固定）
        .resize({
          width: targetWidth,
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
        .toFile(outAbs);

      result.thumbs[String(targetWidth)] = outRel;
    } catch (err) {
      // 单档失败不影响其他档位，也不影响原图
      result.thumbs[String(targetWidth)] = null;
    }
  }

  return result;
}

module.exports = {
  generateThumbnails,
  thumbFileName,
  sourceVersion,
  THUMB_WIDTHS,
  THUMBNAILABLE_EXTENSIONS,
};