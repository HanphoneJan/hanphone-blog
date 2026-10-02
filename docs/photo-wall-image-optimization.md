# 照片墙图片加载优化

## 问题现象

进入照片墙页面时经常出现「加载失败」，往下滚动反而正常。

## 根因

现网（`hanphone.cn/atlas`）从建站起就没有任何缩略图，列表页直接 `<img src="原图">`。
截至改造前，墙上可见的 9 张照片合计 **44.53 MB**，单张最大 **12.08 MB**（`遐蝶2.png`）。

放大问题的两个机制：

### 1. 瀑布流没有占位高度 → lazy 加载被连环触发

`.masonry-columns` 用 CSS `column-count: 4` 实现，而 `.image` 是 `width:100%; height:auto`，
DOM 上没有 `width`/`height`，数据库里也没有宽高字段。加载前卡片只有 placeholder 的
`min-height: 180px`，加载完变成真实高度（竖构图可达数千 px）。

于是形成级联：

```
一张图加载完 → 整列重排 → 原本视口外的卡片滑进视口
            → el-image 的 lazy IntersectionObserver 全部触发
            → 进页面瞬间几十张原图并发请求 → 超时/失败
```

这正是「进页面就失败、往下滚反而正常」的原因。

### 2. 生产机规格撑不住这个并发

`hanphone.cn` 机器只有 **2 vCPU / 1941 MB 内存**，同时跑着 nginx、Spring Boot（504MB）、
Next.js（214MB）和 4 个 pm2 Node 进程，可用内存长期在 600MB 上下。

### 3. Service Worker 把原图当缓存

`vite.config.ts` 里图片规则是 `CacheFirst` + 100 条上限。跨域 opaque 响应整份进
Cache Storage，单条可达 12MB，配额很快撑爆，反而每次都要重新下载。
另外那条 API 规则 `/api/.*\.json$` 与真实路径 `/nodejs/atlas/*` 完全不匹配，一直是死规则。

## 实测效果

| | 改造前 | 改造后 |
|---|---|---|
| 9 张图片总体积 | 44.53 MB | **0.36 MB** |
| 单张最大 | 12.08 MB | 64 KB |
| 并发拉取耗时 | >120s（超时） | **875 ms** |
| 失败数 | 频繁 | **0** |

## 改造内容

### 1. 上传时生成多档缩略图（`admin-file/lib/thumbnail.js`）

引入 sharp，在文件落盘后同步生成 320w / 800w / 1600w 三档 WebP（质量 80），
原图保留给预览与下载。

要点：

- **缩略图文件名带源文件版本号**：`<原名>-800w.<mtime+size 的 sha1 前 8 位>.webp`。
  源文件被覆盖后版本号变化 → 缩略图 URL 变化 → 各级缓存自动失效，
  因此可以安全地给缩略图加 `immutable` 长期缓存。
- 目标宽度 ≥ 原图宽度时不生成，由前端回退到原图。
- 遵循 EXIF Orientation 摆正后再缩放，`width`/`height` 存的是摆正后的真实尺寸。
- **sharp 延迟 require**：libvips 静态链进进程常驻多占约 30MB，
  而文件服务绝大多数请求只是 stat/读写，不该为此买单。
- `sharp.concurrency(2)` + `cache({ files: 0, items: 50, memory: 64 })`
  适配 2 核机器，避免上传时抢占整机资源。

`/upload` 与 `/upload/batch` 的响应新增 `width` / `height` / `thumbPath` / `thumbs`。
缩略图生成失败**不影响原图上传成功**，只记 warn 日志。

### 2. 数据库

`photo-wall-server/migrations/001_atlas_thumbnail.sql`（幂等）：

```sql
ALTER TABLE public.atlas_files
    ADD COLUMN IF NOT EXISTS width integer,
    ADD COLUMN IF NOT EXISTS height integer,
    ADD COLUMN IF NOT EXISTS thumb_path character varying(512);

ALTER TABLE public.atlas_files
    ALTER COLUMN path TYPE character varying(512);  -- 原 128，中文名 + 域名编码后已到 101
```

`server/init.sql` 的建表语句已同步。

### 3. 历史数据回填

```bash
cd ~/server_file
node scripts/backfill-thumbs.js --env /home/hanphone/server_atlas/.env --dry-run  # 先看
node scripts/backfill-thumbs.js --env /home/hanphone/server_atlas/.env            # 再跑
```

- 复用 `lib/thumbnail.js`，与新上传的照片 URL 规则完全一致。
- 自动兼容库里两种 URL 形态（`blog/atlas/x.jpg` 与 `blog%2Fatlas/x.png`）。
- `--force` 可在源文件变更后重新生成；默认只补 `thumb_path IS NULL` 的记录。

### 4. 前端（`apps/photo-wall`）

新增 `src/composables/useImageSrc.ts`：

- `displaySrc(item)` — 列表页走缩略图，无缩略图时回退原图；预览/下载仍走原图。
- `aspectRatio(item)` — 用真实宽高锁死瀑布流卡片高度，**断掉 lazy 级联**（最关键的一条）。
- `retry(item)` — 失败后按 1.2s / 3s / 7s 退避重试 3 次，通过改写 URL 触发
  （nginx `try_files $uri` 忽略查询串，命中同一文件）。

`Atlas.vue` 三种视图（瀑布流 / 野兽派 / 时间线）都接上了缩略图与重试；
`AdminAtlas.vue` 的网格与列表缩略图也换成 `thumb_path`（后台一次渲染全部照片，
直出原图会同时打爆浏览器和服务器）。

### 5. Service Worker（`vite.config.ts`）

- API 规则修正为 `/nodejs/atlas/*`（原规则是死规则），加 `cacheableResponse` 与 5s 超时。
- 图片规则 `CacheFirst` → `StaleWhileRevalidate`，`cacheName` 升到 `atlas-image-cache-v2`
  让旧缓存自然淘汰，条目 300 / 30 天 / `purgeOnQuotaError`。

## 修复记录：进页面先闪「没有符合筛选条件的照片」

**现象**：Android App 里每次进入照片墙，先显示「没有符合筛选条件的照片，换个标签试试吧」，
过一会才出现照片。

**根因**：`Atlas.vue` 原本只有空态、没有加载态。`atlasData` 初始为 `[]`，
`atlasShow()` 是 `onMounted` 里发起的异步请求，请求返回前
`filteredAtlasData.length === 0` 恒成立，空态就会先渲染出来。

Android 上必现是因为两个因素叠加：

1. 每次进入都是**全新页面实例**，没有 SPA 路由复用。
2. `sessionStorage.atlasWelcomeShown` 在 WebView 里是持久化的（`domStorageEnabled = true`），
   所以**第二次起欢迎页被跳过**，没有任何东西遮挡这段空窗期。
   首次访问还有 3s 欢迎页兜着，反而看不到。
3. `/nodejs/atlas/show` 冷启动实测 **2.3s**（连接热起来后约 350~430ms），
   2C/2G 的服务器 + 移动网络下这个空窗足够被看见。

**修复**：新增 `isLoading` 状态，三种视图的空态判定都从

```vue
<div v-if="filteredAtlasData.length === 0" class="atlas-empty">
```

改为

```vue
<div v-if="isLoading" class="atlas-loading">
  <el-icon class="is-loading"><Loading /></el-icon>
  <span>正在加载照片...</span>
</div>
<div v-else-if="filteredAtlasData.length === 0" class="atlas-empty">
```

`isLoading` 初值 `true`，只在 `atlasShow()` 的 `finally` 里置 `false`，
所以请求失败时也会正常结束加载态（不会一直转圈）。

编译产物可以验证互斥关系已生效：

```js
isLoading ? render(atlas-loading)
         : 0 === filtered.length ? render("没有符合筛选条件的照片…")
         : ""
```

## 待办：nginx 加 immutable（需要 root）

改造后缩略图内容与 URL 一一对应，可以放心长期缓存。当前 `hanphone.top` 的
`location /` 只给了 `max-age=604800`（7 天），够用但不极致。

在 `/etc/nginx/conf.d/hanphone.top.conf` 的 `server` 块内，
**放在 `location /` 之前**（`^~` 前缀优先，顺序其实无所谓，但放前面更易读）：

```nginx
# 照片墙 / 随笔缩略图：文件名含源文件版本号，内容不变 URL 就不变，可永久缓存
location ^~ /blog/atlas/ {
    root /home/hanphone/server_file/uploads;
    try_files $uri @backend;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Content-Type-Options "nosniff";
}

location ^~ /blog/essay/ {
    root /home/hanphone/server_file/uploads;
    try_files $uri @backend;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Content-Type-Options "nosniff";
}
```

改完执行 `nginx -t && nginx -s reload`。

> 不要给 `location /` 全局加 `immutable`：其它 namespace（`blog/blog`、`blog/avatars`）
> 存在同名覆盖的情况，永久缓存会导致用户拿到旧文件。只有 `blog/atlas` 与 `blog/essay`
> 的缩略图走了内容哈希命名，才是安全的。

### 顺带发现：`location /atlas` 完全没有缓存头

`hanphone.cn.conf` 的 `location /atlas` 块里没有任何 `add_header`，`index.html` /
sw.js / JS chunk 全部走 nginx 默认（无 `Cache-Control`）。两个隐患：

1. **`index.html` 被浏览器启发式缓存后，发版拿到的旧 HTML 会引用已被删除的 chunk 文件名 → 404 → 白屏。**
   改造过程中实测到过一次：直接 fetch `sw.js` 拿到的是旧预缓存清单（里面还是旧 chunk 名）。
2. 资源没有长期缓存，每次进页面都要重新下载 JS/CSS（照片墙 SPA 的 JS 约 1.9 MB）。

建议的加固配置（同样需要 root）：

```nginx
# 带 hash 的构建产物：永久缓存
location ^~ /atlas/assets/ {
    alias /home/hanphone/html/atlas/assets/;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}

# 入口文件与 SW：必须每次回源校验，否则发版后用户卡在旧版本
location = /atlas/index.html {
    alias /home/hanphone/html/atlas/index.html;
    add_header Cache-Control "no-cache, must-revalidate";
}
location = /atlas/sw.js {
    alias /home/hanphone/html/atlas/sw.js;
    add_header Cache-Control "no-cache, must-revalidate";
}

location /atlas {
    alias /home/hanphone/html/atlas;
    index index.html;
    try_files $uri $uri/ /atlas/index.html;
    add_header Cache-Control "no-cache, must-revalidate";
}
```

（现代浏览器对 SW 脚本默认绕过 HTTP 缓存，所以 `sw.js` 那条主要是防代理/CDN 层；
真正必要的是 `index.html` 那条。）

## 随笔（Essay）图片优化

随笔与照片墙同源：图片同样存 admin-file 且**从未生成过缩略图**。
改造前 `uploads/blog/essay/` 有 21 张图片共 **74.65 MB**，单篇最多挂 9 张图。

### 改造前后对比（现网 21 张图片实测）

| | 改造前 | 改造后 |
|---|---|---|
| 21 张图片总体积 | 74.65 MB | **0.75 MB**（100×） |
| 单篇最多的一篇（1108，9 张） | 40.77 MB | **386 KB**（108×） |

关键前提：**admin-file 的 `/upload` 接口本来就已经在生成缩略图**（照片墙改造时加的
`buildImageMeta` 对所有 namespace 生效），只是随笔链路把 `thumbPath` / `width` / `height`
在 `useEssayFiles.ts` 里丢掉了，缩略图躺在磁盘上没人引用。
所以这次改造的主体是「把已有能力接通」，不是新增图片处理。

### 改动清单

**数据库**（`photo-wall-server/migrations/002_essay_thumbnail.sql`，幂等）：
`t_essay_url` 增 `width` / `height` / `thumb_path`，`server/init.sql` 同步。

**Spring Boot**：
- `EssayFileUrl` 实体增三字段
- 新增 `util/EssayFileUrlFields`：统一 admin 与 MCP 两个入口的字段校验
  （非法值一律落 null，绝不把脏数据写进表）
- `EssayController` / `McpContentApiController` 两处手写 `Map` 解析都接上新字段
- `EssayServiceImpl` 新增 `collectPhysicalUrls()`：**回收物理文件时把缩略图一并删掉**。
  不做这一步会同时留下孤儿 webp，并让 `AdminFileServiceImpl` 删空目录的尝试失败。

**Web**：
- `useEssayFiles.ts` 保留上传响应里的缩略图字段；删除未入库文件时连缩略图一起删
- `FileGallery.tsx` 用缩略图 + `aspect-ratio` 占位（避免图片加载完撑开容器引发重排，
  与照片墙同一个坑）；`ImageZoomModal` **保持原图**以保证放大画质
- `FilePreview.tsx` 后台预览也换缩略图（后台一次渲染整页附件，直出原图最伤）

**Android**：
- `EssayFileUrl` 模型增三字段 + `displayUrl()`（列表缩略图）/ `originalUrl()`（详情原图）
- 九宫格用 `displayUrl()`，详情页用 `originalUrl()`
- **顺带修一个 bug**：过滤视频写的是 `urlType != "video"`，而后端 `url_type` 存的是大写
  `"VIDEO"`，条件恒为真，视频一直被当图片丢进 `AsyncImage` 加载。改成忽略大小写比较。

**回填**（`backfill-thumbs.js` 加了 `--target`）：

```bash
cd ~/server_file
# 随笔（Spring Boot 的 .env，脚本兼容 PG_* 与 DB_* 两套变量名）
node scripts/backfill-thumbs.js --env ~/server_blog/.env --target essay --dry-run
node scripts/backfill-thumbs.js --env ~/server_blog/.env --target essay
# 照片墙（原有）
node scripts/backfill-thumbs.js --env ~/server_atlas/.env --target atlas
```

随笔表只处理 `url_type = 'IMAGE'` 的本站附件（外链没有缩略图可言）。

### 已部署（2026-10-03）

`sudo systemctl restart blog` 已执行，新 Jar 生效。线上验证：

```
图片附件 21 个 | 返回 thumbPath 21 | 返回宽高 21
样本字段: ['createTime','height','id','isValid','thumbPath','url','urlDesc','urlType','width']
```

Android 真机（release APK，`versionCode 14`）装机后从 admin-file 访问日志确认：
随笔 9 张图的九宫格请求**全部是 800w 缩略图，0 次原图**。

## 登录态契约（Android WebView ↔ 照片墙）

照片墙是独立部署的 Vue SPA，登录态存在**它自己的 localStorage**，与 App 的 DataStore
是两套互不相通的存储。Android 原先完全没有注入，于是出现过一个迷惑现象：
「从没给 WebView 写过 token，照片墙却显示已登录」。

**真实原因**：照片墙**自带的登录页**（`/login`，走 `https://hanphone.cn/api/login`）
曾在 WebView 里被用过一次，而 `domStorageEnabled = true` 让 localStorage 按 origin
持久留在 App 数据目录里，之后每次进入都带着那个 token。也就是说登录态长期
「能用但与 App 不同步」——在 App 里退出登录后，照片墙仍显示已登录、还能点赞和进管理页。

### 已修复：`core/AuthBridge.kt`

| 环节 | 做法 |
|---|---|
| 注入时机 | `WebViewCompat.addDocumentStartJavaScript`，在页面自身 JS **之前**执行 |
| 为什么不用 `onPageFinished` | 照片墙的 Pinia store 在模块初始化时**同步**读 localStorage（`store.ts`），晚一拍就晚了 |
| origin 白名单 | 仅 `https://hanphone.cn` / `https://www.hanphone.cn`；项目页打开的外链拿不到 token |
| App 未登录时 | 脚本**删除** `token`/`userInfo`/`expire`，而不是跳过 —— 否则页面里残留的旧 token 会继续生效 |
| 登出清理 | `ProfileScreen` 的「退出」里调 `AuthBridge.clearWebStorage()`（`WebStorage.deleteAllData()`），因为登出时 WebView 实例往往已销毁，`evaluateJavascript` 不可靠 |
| 降级 | WebView < 83 无该 API，走 `evaluateJavascript` + `reload()` |
| 注入 vs 加载顺序 | 必须等 DataStore 真读到登录态再注入、再 `loadUrl`（见下方「顺序坑」） |

两端用的是**同一个登录接口**（`POST https://hanphone.cn/api/login`，返回 `{user, token, expire}`），
所以 token 通用，无需换发。

为此给 `AuthData` 补了 `username` 字段（登录名，非昵称）：照片墙管理页按登录名定位当前用户、
上传时用它作作者名兜底，而 App 之前只存了昵称。登录/注册/改资料三处都要传。

### 注入脚本契约

照片墙 `store.ts` 会读这些 localStorage 键，注入方必须满足：

```
token     : string  登录态凭证（未登录时必须删除，不能留空串）
userInfo  : JSON    至少含 id / type / username / nickname / avatar
expire    : string  可选
```

`type === '1'` 决定 `store.isAdmin`，直接决定管理页入口是否显示——写错等于权限判断失效。
脚本用 `JSONObject.quote()` 转义并逐项 `try/catch` 包裹，已验证含单引号/双引号/反斜杠/换行/
`<img>` 的昵称能原样还原，不存在注入风险。

### 顺序坑（实现时踩过一次）

`collectAsState` 的 `initial` **不能**用 `AuthData()` 兜底，必须用 `null` 表示「还没读到」：

```
collectAsState(initial = AuthData())   ← 错
  首帧 currentAuth 为空
  → 注入脚本按「未登录」生成（删除三个键）
  → 紧接着 loadUrl
  → 页面带着「清除登录态」的脚本加载完成
  → App 明明已登录，照片墙却显示未登录（要进第二次才对）
```

正确写法：注入和加载都 gate 在 `authResolved` 上，且注入的 `LaunchedEffect` 声明在
加载的**前面**（Compose 按声明顺序启动，`addDocumentStartJavaScript` 是同步调用）。
同理不要在 `AndroidView` 的 `factory` 里注入——那里执行时 DataStore 大概率还没吐值。

## 顺带发现（本次未处理）

- **孤儿文件**：磁盘 `uploads/blog/atlas/` 有 26 个原图，`atlas_files` 只有 13 条记录。
  其中 4 个是站点自身在用的资源（`background.jpeg`、`icon.png`、`bg_1.jpg`、`bg_4.jpg`，
  被 `Atlas.vue` 和 `public/index.html` 硬编码引用），其余 10 个（15.3MB 里的 ~14.3MB）
  没有任何数据库记录，疑似历史删除或入库失败留下的残留。
  根因是 `photo-wall-server/controller/admin/deletePhoto.js:32` 注释写着「仅删除数据库记录」，
  删照片时磁盘文件永不清理。**清理前需逐个确认引用**，本次未动。
- **`path` 硬编码域名**：`admin-file/server.js:816` 固定拼 `https://hanphone.top/`，
  域名被冻进了数据库，换域名要写数据迁移。
- **列表接口不分页**：`Atlas.vue` 请求 `/show` 时不带 `page`/`limit`，
  服务端其实支持（`controller/show.js:22-24`，上限 100），目前一次性拉全量。
  照片数量涨到几百张后需要接上分页 + 滚动加载。
- **4 张照片 `type=0`**：id 1/2/4/13 不在墙上显示，但仍占 7.5MB 磁盘与流量（预览、下载）。