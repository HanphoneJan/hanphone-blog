# admin-file 📂

![Node.js](https://img.shields.io/badge/Node.js-≥18.x-green?logo=node.js&logoColor=white)![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey?logo=express&logoColor=white)![Multer](https://img.shields.io/badge/Multer-2.0.2-orange)![Swagger](https://img.shields.io/badge/Swagger-5.0.1-green)![JWT](https://img.shields.io/badge/JWT-Auth-blue)

Node.js 实现的轻量级文件管理接口服务，提供完整的文件和目录管理功能，支持 JWT 认证、Swagger API 文档和完善的日志系统。

## ✨ 功能特性

- 📤 **文件上传** - 支持认证上传（最大1GB）和公共头像上传（最大5MB）
- 👤 **头像上传** - 无需认证的公共接口，支持速率限制（每IP每小时5次）
- 🗑️ **文件删除** - 安全删除指定文件或空目录
- 📁 **目录创建** - 创建命名空间目录
- 📋 **文件管理** - 获取文件列表、文件详情
- 🔍 **文件分类** - 自动识别图片、视频、音频、代码、文档、压缩包、字体等类型
- 🗂️ **命名空间** - 支持按命名空间组织文件
- 📥 **静态访问** - 支持文件预览（图片/PDF/音视频）和下载
- 🔐 **JWT 认证** - 安全的 API 访问控制
- 📖 **Swagger 文档** - 完整的 API 接口文档
- 📝 **日志系统** - 详细的请求和错误日志记录

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18.x
- pnpm

### 作为 Monorepo 的一部分

本项目已纳入根目录的 pnpm workspace，推荐在根目录统一管理：

```bash
# 根目录安装所有依赖
pnpm install

# 启动文件服务（在根目录执行）
pnpm --filter admin-file start
```

### 独立安装步骤

```bash
cd admin-file

# 安装依赖
pnpm install

# 启动服务
pnpm start
```

### 环境配置

创建 `.env` 文件：

```env
PORT=4000
JWT_SECRET=your-secret-key
```

### 访问 API 文档

启动服务后，访问 Swagger 文档：

```
http://localhost:4000/api-docs
```

## 📡 API 接口

### 公共接口（无需认证）

- `POST /upload/avatar` - 上传头像（支持 jpg/png/gif/webp/avif/svg，≤5MB）

### 认证接口（需要 JWT）

- `POST /upload` - 上传文件（支持所有类型，≤1GB）
- `DELETE /delete` - 删除文件或目录（删图片时会连带删除同目录的 `-320w/-800w/-1600w` 缩略图，响应里返回 `thumbnailCount`）
- `GET /files` - 获取文件列表
- `GET /file` - 获取文件详情
- `POST /directory` - 创建命名空间目录

### 静态文件访问

- `GET /{category}/{filename}` - 访问文件（如 `/images/photo.jpg`）
- `GET /{namespace}/{filename}` - 访问命名空间文件
- 添加 `?download=1` 参数强制下载

### 媒体派生资源（视频 HLS / 图片缩略图）

| 接口 | 说明 |
| --- | --- |
| `GET /media/meta?path=blog/essay/foo.mp4` | 视频状态：`ready` / `pending` / `processing` / `failed` / `none`，以及 HLS、海报、原片、下载地址 |
| `GET /media/poster.jpg?path=...` | 视频封面 JPEG（未生成时 404） |
| `GET /media/thumb?path=...&w=320\|800\|1600` | 图片缩略图，302 到带版本号的 WebP；按需生成，失败/原图较小回退原图 |
| `POST /media/transcode` | 手动触发视频转码（需要认证，body: `{ "path": "...", "force": false }`） |

视频**原片永远保留在 uploads 原路径**，HLS 只是派生资源：

```
uploads/blog/essay/foo.mp4                        ← 原片（管理端可下载）
uploads/.video/blog/essay/foo-<版本hash>/         ← 派生目录
  master.m3u8
  v0/playlist.m3u8 + seg_00000.ts ...             ← 720p
  v1/playlist.m3u8 + seg_00000.ts ...             ← 1080p（源片足够大时）
  poster.jpg
  meta.json
```

- 派生目录名带源文件版本号（mtime + size 哈希），源文件覆盖后 URL 自动变化，可安全加 `immutable` 长缓存。
- 上传接口收到视频后**只入队**，异步转码，不阻塞上传响应；默认并发 1、`nice` 降优先级，适配 2C/2G。
- 删除原片会一并回收所有版本的派生目录。
- `ffmpeg` / `ffprobe` 缺失时自动降级：不生成 HLS，原片仍可播放/下载，不影响上传。
- **Cloudflare 上传上限**：经 `hanphone.top` 的请求受 Cloudflare 单请求大小限制（Free/Pro 100 MB，Business 200 MB），
  超过 100 MB 的视频会在到达 admin-file 前被拒；大视频请用 R2 直传、直连源站或分片上传。

```bash
# 历史视频回填（原片保留，只补 HLS/海报）
cd ~/server_file
node scripts/transcode-videos.js --env /home/hanphone/server_file/.env --dry-run
node scripts/transcode-videos.js --env /home/hanphone/server_file/.env
```

### 缓存与 nginx

- 带版本号的缩略图：`Cache-Control: public, max-age=31536000, immutable`
- 原图 / 视频原件：`public, max-age=604800, stale-while-revalidate=86400`
- HLS playlist / 分片：`public, max-age=31536000, immutable`

生产建议让 nginx 直接读 `uploads/` 与 `uploads/.video/`（`sendfile`），只把 miss 和 API 回源到 Node；
示例见 [`nginx/hanphone.top.conf.example`](nginx/hanphone.top.conf.example)。

> Cloudflare 默认只按扩展名缓存，`.m3u8` / `.ts` 不在默认列表里。**必须**给 `/hls/*` 加一条 Cache Rule
> （Cache Eligibility: Eligible，Edge TTL 1 年），否则每个 HLS 分片都会回源到 3Mbps 的小机器。
> 具体步骤见 [`docs/media-delivery.md`](../docs/media-delivery.md)。

更多接口详情，请查看 Swagger 文档。

## 📁 项目结构

```
admin-file/
├── uploads/                 # 上传文件存储目录
│   ├── temp/               # 临时上传目录
│   ├── .video/             # 视频 HLS/海报派生目录（由转码任务生成）
│   └── blog/avatars/       # 头像存储目录
├── lib/
│   ├── thumbnail.js        # 图片缩略图（sharp）
│   ├── video.js            # 视频 HLS 转码队列 / ffmpeg / meta
│   └── paths.js            # 路径安全与 URL 编码
├── nginx/                  # nginx 示例配置（静态直出 + HLS CORS）
├── scripts/                # 缩略图/视频回填脚本
├── logs/                   # 日志文件目录
├── server.js               # 主服务器文件
├── token.js                # JWT 认证处理
├── logger.js               # 日志系统
├── package.json            # 项目配置
└── .env                    # 环境变量配置
```

### 环境变量（视频）

完整列表见 `.env.example`。关键项：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `VIDEO_TRANSCODE_ENABLED` | `true` | 关闭后原片仍可上传/播放/下载，只是不生成 HLS |
| `VIDEO_HLS_MAX_HEIGHT` | `1080` | 最高档位（短边）；`720` 可显著省磁盘/CPU |
| `VIDEO_HLS_SEGMENT_SECONDS` | `4` | HLS 分片长度 |
| `VIDEO_TRANSCODE_CONCURRENCY` | `1` | 同时转码任务数 |
| `VIDEO_FFMPEG_THREADS` | `2` | ffmpeg 线程数 |
| `VIDEO_TRANSCODE_NICE` | `10` | ffmpeg 的 nice 优先级 |
| `VIDEO_TRANSCODE_TIMEOUT_MS` | `21600000` | 单任务超时（6 小时） |
| `PUBLIC_FILE_BASE_URL` | `https://hanphone.top` | 返回给前端的绝对文件域名 |

### 原片下载

- 管理端「文件管理」页的下载按钮走 `?download=1`，拿到的始终是**原格式原片**。
- 随笔附件里的视频格子在桌面端悬停时也有「下载原视频」按钮。
- 公开随笔的视频弹窗底部提供「下载原视频」。
- HLS 只是播放用的派生资源，不会替换或删除原片。
