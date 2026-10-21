/**
 * 路径与 URL 编码工具
 *
 * 文件服务的路径有两个来源：
 * 1. 上传时拼接的相对路径（如 blog/essay/foo.mp4）；
 * 2. 旧数据里把整段斜杠编码过的 URL（如 blog%2Fessay/foo.png）。
 *
 * 统一在这里做「逐段编码」和「不许越出 uploads 根目录」的校验，
 * 避免 server.js / lib/video.js 各写一份，出现规则漂移。
 */

const path = require("path");

/**
 * 按路径段逐段编码（保留 / 分隔符）。
 * 整串 encodeURIComponent 会把 / 变成 %2F，虽然 nginx 能容错，但 URL 可读性差，
 * 部分 CDN / 代理对 %2F 处理也不一致，因此统一按段编码。
 */
function encodeUrlPath(relPath) {
  return String(relPath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * 把相对路径解析到 baseDir 内，越界直接抛 400。
 * 允许传入以 / 开头的路径（会被当成相对路径处理），但禁止 NUL 字节。
 */
function resolveInside(baseDir, relPath) {
  if (typeof relPath !== "string" || relPath.includes("\0")) {
    const err = new Error("非法的路径");
    err.statusCode = 400;
    throw err;
  }

  const cleaned = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const base = path.resolve(baseDir);
  const target = path.resolve(base, cleaned);

  if (target !== base && !target.startsWith(base + path.sep)) {
    const err = new Error("非法的路径");
    err.statusCode = 400;
    throw err;
  }

  return target;
}

/** 绝对路径转相对 baseDir 的 POSIX 路径（用于 URL / 派生目录） */
function toPosixRelative(baseDir, absPath) {
  return path.relative(baseDir, absPath).split(path.sep).join("/");
}

module.exports = {
  encodeUrlPath,
  resolveInside,
  toPosixRelative,
};
