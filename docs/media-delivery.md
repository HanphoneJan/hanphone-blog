# 媒体加载：原片保留 + HLS 播放

> 对应改造：admin-file 的 P0/P1/P2。目标是在**不丢原视频**的前提下，把「图片/视频比视频网站慢」的问题从链路层面解决。

## 1. 问题回顾

实测（Cloudflare HKG 边缘，2026-10）：

| 请求 | 缓存 | TTFB | 总耗时 |
| --- | --- | --- | --- |
| 49 KB 缩略图 | HIT | 0.27 s | 0.30 s |
| 49 KB 缩略图 | MISS | 1.4–3.9 s | 1.5–4.1 s |
| 3.4 MB 原图 | MISS | 1.3 s | 8.3 s（≈0.41 MB/s） |
| 3.4 MB 原图 | HIT | 0.28 s | 3.2 s（≈1 MB/s） |

两个根因：

1. **图片**：不是缩略图不够小，而是边缘没命中时回源太慢（49 KB 也要 1–4 s 才出首字节），以及仍有链路直出原图。
2. **视频**：源站上行约 3.2 Mbps，低于 1080p 实时码率（5–10 Mbps）；同时没有转码/切片/多码率，整文件 progressive 下载无法持续播放。

## 2. 改造后的结构

```
uploads/
├── blog/essay/foo.mp4                     ← 原片，原格式原封不动保留
└── .video/
    └── blog/essay/foo-<版本hash>/
        ├── master.m3u8                     ← 多码率入口
        ├── v0/playlist.m3u8 + seg_*.ts     ← 720p
        ├── v1/playlist.m3u8 + seg_*.ts     ← 1080p（源片足够大时）
        ├── poster.jpg
        └── meta.json
```

- 派生目录名带源文件 `mtime + size` 的短哈希；源文件被覆盖后 URL 自动变化，因此 HLS 分片、playlist、海报都能 `immutable` 缓存一年。
- 原片路径、数据库里的 `url` 完全不变；管理端 `?download=1` 下载的始终是原格式原片。
- HLS 只服务播放；用户想拿原片随时可以下载。

## 3. 上传后的流程

1. `POST /upload` 落盘原片 + 生成图片缩略图（原有逻辑）。
2. 如果是视频，调用 `enqueueVideoJob()` 入队并**立即返回**；响应里带 `media.status = pending`。
3. 后台队列（默认并发 1、`nice 10`、ffmpeg 2 线程）：
   - `ffprobe` 读取时长/分辨率/旋转/音频；
   - 按短边规划 1080/720 档位（不放大）；
   - 逐档转 H.264/AAC，切 4 s HLS 分片；
   - 抽 1 s 处帧生成 `poster.jpg`；
   - 写 `master.m3u8` 与 `meta.json`；
   - 清理同源文件的旧版本派生目录。
4. 前端打开播放器时请求 `GET /media/meta?path=...`：
   - `status=ready` + `hls` → hls.js / Safari 原生 HLS；
   - `pending` / `processing` → 先播原片，角标提示「高清转码中」；
   - `failed` / `none` / `unavailable` → 播原片；浏览器不支持容器/编码时提示下载原视频。

## 4. 图片链路

- `GET /media/thumb?path=...&w=320|800|1600`：302 到 `<原名>-<w>w.<hash>.webp`；文件缺失时按需用 sharp 生成，原图较小或格式不支持则回退原图。
- 随笔九宫格使用 `srcset` + `sizes`，浏览器按视口/DPR 选 320/800/1600；不再固定只拿 800w。
- 后台随笔附件、文件管理预览优先缩略图；原图只用于放大/下载。
- 上传时仍按原逻辑生成三档 WebP；老数据可以用 `scripts/backfill-thumbs.js` 回填，也可以由 `/media/thumb` 首次访问时按需生成。

## 5. 缓存策略

| 资源 | 头 |
| --- | --- |
| 带版本号缩略图 `*-800w.<hash>.webp` | `public, max-age=31536000, immutable` |
| 原图 / 视频原件 | `public, max-age=604800, stale-while-revalidate=86400` |
| HLS master/playlist/segment | `public, max-age=31536000, immutable` |
| `/media/meta` | `no-store`（状态会变） |
| `/media/poster.jpg` | `public, max-age=86400`（重转码后 `?v=` 变化） |

## 6. 部署步骤

### 6.1 安装 ffmpeg

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
ffmpeg -version
ffprobe -version
```

> 没有 ffmpeg 也能启动：视频只保留原片、不生成 HLS，前端自动回退原片。

### 6.2 更新 admin-file 与配置

```bash
cd ~/server_file
pnpm install            # 本次没有新增 npm 依赖；hls.js 在 web 侧
# 按需修改 .env（见 admin-file/.env.example 的视频段）
sudo systemctl restart admin-file   # 或 pm2 restart <进程名>
```

常用环境变量：

```env
VIDEO_TRANSCODE_ENABLED=true
VIDEO_HLS_MAX_HEIGHT=1080      # 磁盘/CPU 紧张时改 720
VIDEO_HLS_SEGMENT_SECONDS=4
VIDEO_TRANSCODE_CONCURRENCY=1
VIDEO_FFMPEG_THREADS=2
VIDEO_TRANSCODE_NICE=10
PUBLIC_FILE_BASE_URL=https://hanphone.top
```

### 6.3 重新构建前端

本次改动了 `web/`（视频播放器、srcset、管理端预览），需要重新构建并部署 Next.js：

```bash
cd <仓库根目录>
pnpm install
pnpm --filter web build
# 按现有部署流程重启 Next（systemd / pm2 / docker）
```

### 6.4 历史视频回填

```bash
cd ~/server_file

# 先看计划
node scripts/transcode-videos.js --env /home/hanphone/server_file/.env --dry-run

# 正式跑（建议低峰期 / nohup）
nohup node scripts/transcode-videos.js --env /home/hanphone/server_file/.env \
  > /tmp/transcode-videos.log 2>&1 &

tail -f /tmp/transcode-videos.log
```

- 原片不动，只补 `.video/`。
- 已有 HLS 的会跳过；`--force` 强制重转。
- `--path blog/essay/foo.mp4` 只处理一个文件。

### 6.5 nginx 直接读盘

把 [`admin-file/nginx/hanphone.top.conf.example`](../admin-file/nginx/hanphone.top.conf.example) 合并进
`/etc/nginx/conf.d/hanphone.top.conf`：

```bash
sudo nginx -t && sudo nginx -s reload
```

> **权限坑**：nginx worker 用户（`nginx` / `www-data`）必须能穿越 `/home/hanphone`。
> 如果该目录是 `710`，nginx 的 `/blog/` 直出会一直回退到 Node。执行一次：
> `sudo chmod o+x /home/hanphone`（只增加穿越权限，不开放目录列表）。
> 生产机的应用脚本 `~/apply-nginx-hanphone-top.sh` 已包含这一步（会先备份并 `nginx -t`，失败自动回滚）。

要点：

- `/blog/` `root` 直出 + `try_files $uri @backend`；
- `/hls/` `alias` 到 `uploads/.video/`，并给 HLS 加 CORS；
- `/media/meta|poster.jpg|thumb|transcode` 精确匹配回 Node；
- `?download=1` 用 map 映射成 `Content-Disposition: attachment`；
- `sendfile on; tcp_nopush on;`。

> 如果 nginx 暂时不改，Node 也能正常服务，只是没有 sendfile 直出，回源仍要经过 Node。

### 6.6 Cloudflare Cache Rule（必须）

Cloudflare 默认按扩展名缓存，`.m3u8` / `.ts` **不在**默认列表里；不配置的话每个 HLS 分片都会回源。

在 Cloudflare Dashboard：

1. **Caching → Cache Rules → Create rule**
2. Rule name: `media-hls`
3. When incoming requests match: `URI Path` `starts with` `/hls/`
4. Cache eligibility: **Eligible for cache**
5. Edge TTL: **Use cache-control header if present**（我们发的是 1 年）
6. Browser TTL: **Respect origin TTL**

另外建议确认 `/blog/*.webp`、`/blog/*.mp4` 的缓存正常（默认扩展名已覆盖）。Cloudflare 免费版单文件缓存上限 512 MB；HLS 分片通常 1–3 MB，正好绕开这个限制。

> 大量视频长期走 Cloudflare 免费版可能触及使用条款。更稳的方案是 Cloudflare Stream，或 R2 + CDN（出网免费）。

## 7. 验证

```bash
# 1) 视频状态
curl -s 'https://hanphone.top/media/meta?path=blog/essay/foo.mp4' | jq

# 2) HLS master / 分片
curl -sI 'https://hanphone.top/hls/blog/essay/foo-<hash>/master.m3u8'
curl -sI 'https://hanphone.top/hls/blog/essay/foo-<hash>/v0/seg_00000.ts'

# 3) 缓存头
curl -sI 'https://hanphone.top/hls/.../v0/seg_00000.ts' | grep -i 'cache-control\|cf-cache-status'

# 4) 下载原片（管理端同款）
curl -sI 'https://hanphone.top/blog/essay/foo.mp4?download=1' | grep -i 'content-disposition'

# 5) 原片仍在
ls -lh ~/server_file/uploads/blog/essay/foo.mp4
```

浏览器里：

- 随笔列表首屏不应再出现 `<video>` 请求（Network 过滤 `media`，只有点开后才加载）。
- 点开视频后，Network 应出现 `master.m3u8` 和分段 `.ts`，`cf-cache-status` 第二次访问为 `HIT`。
- 播放器失败时应自动回退原片；仍失败则提示「下载原视频」。

## 8. 资源与限制

- **磁盘**：720p HLS 大约 1–1.5 GB/小时，1080p 约 2–3 GB/小时，再加原片。磁盘紧张时设 `VIDEO_HLS_MAX_HEIGHT=720`。
- **CPU**：2C/2G 上 1080p 转码约为实时的 0.5–2 倍；一个 30 分钟视频可能跑 15–60 分钟。队列默认一次一个、`nice 10`，不影响 API。
- **冷缓存**：源站上行约 3.2 Mbps，1080p 分片第一次回源可能填不满实时码率，首个观众仍可能短暂缓冲；低峰期先访问一遍预热，或把 `VIDEO_HLS_MAX_HEIGHT` 设 720，体验更稳。
- **重启**：队列在内存里，进程重启会丢失未完成任务；`status.json` 超过 6 小时会被判定失败，可重新上传/运行回填脚本。
- **原片格式**：原片保留原格式，管理端下载/浏览器直链都不变；HLS 只是新增的播放副本。
- **Android**：本次未改 Android，客户端仍使用原片 URL；HLS 只作用于 web/管理端。原片随时可下载，后续接 Media3/ExoPlayer 时再使用 `/media/meta` 里的 HLS。
- **上传上限**：admin-file 自身允许 1 GB，但 `hanphone.top` 经过 Cloudflare。Cloudflare Free/Pro 的单请求上传上限是 **100 MB**（Business 200 MB），超过这个大小的视频会先被 Cloudflare 拒掉，请求到不了 admin-file。大视频请走 R2/对象存储直传、直连源站域名，或后续加分片上传。
