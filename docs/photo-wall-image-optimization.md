# 照片墙 / 随笔图片加载优化

列表页曾经频繁「加载失败」，往下滚反而恢复。根因与修复如下，**结论和配置都在这里，历史排查过程不再保留**。

## 根因

1. **没有缩略图**：列表直接加载原图。改造前照片墙 9 张图合计 44.53 MB，单张最大 12.08 MB。
2. **瀑布流没有占位高**：`column-count` 布局里 `height:auto`，图片加载完列高突变 → 视口外卡片滑入 →
   lazy 监听器连环触发 → 进页面瞬间几十张原图并发，2C2G 的服务器直接超时。
3. **Service Worker 缓存了原图**：`CacheFirst` 把跨域 opaque 响应整份塞进 Cache Storage，
   单条可达 12 MB，配额很快撑爆，反而每次重新下载。

## 效果

| | 改造前 | 改造后 |
| --- | --- | --- |
| 照片墙 9 张总体积 | 44.53 MB | **0.36 MB** |
| 单张最大 | 12.08 MB | 64 KB |
| 并发拉取耗时 | >120s（超时） | **875 ms** |
| 随笔 21 张总体积 | 74.65 MB | **0.75 MB**（100×） |

## 改了什么

### 1. 上传时生成缩略图（`admin-file/lib/thumbnail.js`）

- sharp 生成 **320w / 800w / 1600w** 三档 WebP（质量 80），原图保留给预览与下载。
- 文件名带源文件版本号：`<原名>-800w.<mtime+size 的 sha1 前 8 位>.webp`。源文件变了 URL 就变，
  可以安全地长期缓存。
- 目标宽度 ≥ 原图时不生成，前端回退原图；EXIF 方向先摆正，`width/height` 存摆正后的真实尺寸。
- sharp **延迟 require**、`concurrency(2)`、`cache({ files: 0, items: 50, memory: 64 })`，适配 2 核机器。
- `/upload`、`/upload/batch` 返回新增 `width/height/thumbPath/thumbs`；缩略图失败不影响原图上传。

### 2. 数据库

`photo-wall-server/migrations/001_atlas_thumbnail.sql`（幂等）给 `atlas_files` 加
`width/height/thumb_path`，并把 `path` 扩到 512；`server/init.sql` 已同步。
随笔对应 `002_essay_thumbnail.sql`（`t_essay_url` 加同样三列）。

### 3. 历史数据回填

```bash
cd ~/server_file
node scripts/backfill-thumbs.js --env /home/hanphone/server_atlas/.env --dry-run
node scripts/backfill-thumbs.js --env /home/hanphone/server_atlas/.env
```

默认只补 `thumb_path IS NULL` 的记录；`--force` 可在源文件变更后重生成。

### 4. 前端（`apps/photo-wall`）

`src/composables/useImageSrc.ts`：

- `displaySrc(item)`：列表走缩略图，缺失回退原图；预览/下载仍用原图。
- `aspectRatio(item)`：用真实宽高锁死卡片高度，**断掉 lazy 级联**（最关键的一条）。
- `retry(item)`：失败按 1.2s / 3s / 7s 退避重试 3 次（改写查询串触发，nginx `try_files` 忽略查询串）。

三种视图与后台网格都接上了缩略图；`Atlas.vue` 必须有 `isLoading` 初值，否则接口返回前会先闪空态。

### 5. Service Worker（`apps/photo-wall/vite.config.ts`）

- 去掉默认的 `NavigationRoute`（它会匹配所有导航并忽略查询串，始终返回预缓存 `index.html`，把旧包钉死）。
- 入口 HTML 不预缓存；导航改 `NetworkFirst`；图片改 `StaleWhileRevalidate`（条目 300 / 30 天 / `purgeOnQuotaError`）。
- API 规则修正为真实的 `/nodejs/atlas/*`，并加超时与 `cacheableResponse`。
- SW 文件名带构建版本、注册代码内联进 `index.html`，绕过 CDN 对 `sw.js` 的缓存。

> **排查口诀**：网页代码改了、App/浏览器里没变化 → 先怀疑旧 Service Worker，而不是重新编译。

### 6. 随笔图片

同一套能力：admin-file 本来就给所有 namespace 生成缩略图，只是随笔链路把 `thumbPath/width/height` 丢了。
现在 `EssayFileUrl.displayUrl()` 用缩略图、`originalUrl()` 用原图，详情页才加载原图。

## 缓存头

`admin-file` 已对 `-(320|800|1600)w.<hash>.webp` 直接返回
`Cache-Control: public, max-age=31536000, immutable`，不改 nginx 也生效。

需要 nginx 直出时（示例见 `admin-file/nginx/hanphone.top.conf.example`）：

```nginx
location ^~ /blog/atlas/ {
    root /home/hanphone/server_file/uploads;
    try_files $uri @backend;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
# /blog/essay/ 同理
```

- 只有 `blog/atlas`、`blog/essay` 的缩略图是内容哈希命名；**不要给 `location /` 全局加 immutable**，
  `blog/blog`、`blog/avatars` 存在同名覆盖。

照片墙 SPA（`/atlas`）自身：

```nginx
location ^~ /atlas/assets/ {
    alias /home/hanphone/html/atlas/assets/;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /atlas/index.html { alias /home/hanphone/html/atlas/index.html; add_header Cache-Control "no-cache, must-revalidate"; }
location = /atlas/sw.js     { alias /home/hanphone/html/atlas/sw.js;     add_header Cache-Control "no-cache, must-revalidate"; }
```

## Android WebView：`vh` 被算成 0

App 内 WebView 的 `100vh/100dvh` 实测恒为 0（`window.innerHeight` 正常），照片墙侧边栏与
`min-height:100vh` 容器会塌陷。页面侧用 `--app-vh` 变量兜底（`main.ts` 写入 `innerHeight`，
CSS 写 `var(--app-vh, 100vh)`）；后台 Next 页面则由 App 的 `core/WebViewFixes.kt` 统一把同源样式表里的
`vh/dvh` 换算成 px。详见 `android/HANDOVER.md` 坑 16 / 39。
