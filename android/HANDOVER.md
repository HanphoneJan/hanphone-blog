# 云林有风 Android 客户端 — AI 交接文档（HANDOVER）

> 用途：供**新接手 AI** 快速理解项目、规避前人踩过的坑。
> 位置：`android/`。配套文件：`README.md`（构建）、本文件（经验与规矩）。
> 铁律：**改动前先读 `web/`（网站前端）与 `docs/chat/`（聊天协议，原 hanphone-chat 已并入本仓库）作为接口与交互的"唯一事实来源"，不要凭直觉假设。**

---

## 1. 项目定位

博客「云林有风」的 Android 原生客户端。Kotlin + Jetpack Compose (Material 3)，对接博客 REST API 与 hanphone-chat 实时聊天。后端代码零改动。

- 导航：**底部 4 Tab**：首页 / 随笔 / 消息 / 我的
- 子页：文章详情、随笔详情、搜索、留言板、友链、设置（设置→外观/数据管理 为二级子页）、登录、注册
- 聊天：原生 Socket.IO（**非 WebView**），复用博客 JWT

## 2. 代码地图（`app/src/main/java/com/hanphone/blog/`）

```
MainActivity.kt         入口（enableEdgeToEdge + BlogAppRoot）
BlogApplication.kt      Application：初始化 ContentStore / ChatNotifier
core/Settings.kt        DataStore：主题模式/自定义背景/访客身份/登录态(AuthData)
data/
  AppGraph.kt           ServiceLocator：进程级 Repository 单例（VM 层使用）
  auth/TokenStore.kt    进程内登录态：token/userId/nickname/avatar/userType
  api/ApiClient.kt      Retrofit×2：api(hanphone.cn/api, 注入 Token 头) + fileApi(hanphone.top)
  api/BlogApi.kt        全部 REST（含聊天 REST 绝对路径 + Bearer + limit 参数）
  api/FileApi.kt        上传 /upload/avatar
  cache/MemoryCache.kt  内存缓存：返回秒显（进程存活期）
  cache/ContentStore.kt 磁盘缓存：冷启动秒显（filesDir JSON，Gson 读写）
  chat/ChatSocket.kt    socket.io 单例：聊天室/私信/AI 流式/心跳(25s)/chatUiVisible
  chat/ChatNotifier.kt  私信系统通知（渠道 + POST_NOTIFICATIONS 运行时权限）
  chat/ChatModels.kt    聊天相关模型
  repo/Repos.kt         BlogRepository / EssayRepository / MessageRepository / FileRepository
ui/
  App.kt                根：主题+背景层+底部导航+路由（4 Tab，200ms 淡入淡出过渡）
  Background.kt         自定义背景层（全局）
  home/HomeScreen.kt + HomeViewModel.kt        首页（列表/筛选/归档全在 VM；分类并入筛选面板）
  essay/EssaysScreen.kt + EssaysViewModel.kt   随笔列表 VM + 详情 VM
  chat/ChatScreen.kt    消息 Hub（状态在 ChatSocket 单例，勿重复建 VM）
  detail/ArticleDetailScreen.kt + ArticleDetailViewModel.kt（key 按博客 id）
  message/MessageScreen.kt + MessageBoardViewModel.kt
  friendlinks/FriendLinksViewModel.kt  search/SearchViewModel.kt
  projects/ProjectsScreen.kt + ProjectsViewModel.kt  项目页（/projects，筛选分组卡片）
  docs/DocsScreen.kt + DocsViewModel.kt         文库页（docNamespace 文件夹树/搜索/类型筛选）
  docs/DocMarkdownScreen.kt                     文库 MD 预览（拉文件服务原文 → Markdown 渲染）
  webview/WebViewScreen.kt      通用 WebView（项目链接 loadUrl / 文库 HTML 文档 fetch+loadDataWithBaseURL；
                               进度条/返回/浏览器外开；主框架加载失败显示「重试/在浏览器打开」错误层）
  core/AuthBridge.kt            第一方 WebView 页（照片墙 hanphone.cn/atlas）登录态注入 + 登出清理
  profile/ProfileScreen.kt + ProfileViewModel.kt
  components/           ArticleCard/Avatar/Skeleton(骨架屏)/Loading/Error/Empty/BottomActionItem
                      SearchField（40dp 紧凑搜索胶囊，替代 M3 OutlinedTextField 56dp）/详情底部栏=细分割线+单行图标文字
  theme/                Material3 Light/Dark 双主题
```

### ViewModel 约定（新页面照此写）

- **三层缓存**：`MemoryCache`（同步，返回秒显）→ `ContentStore`（磁盘，冷启动秒显）→ 网络（始终刷新）。
- VM 用 Compose `mutableStateOf` 暴露状态（`private set`），UI 直接 `vm.xxx` 读取；页面内不再 `remember` 业务状态。
- VM 构造参数注入 Repository（默认值 = `AppGraph.xxxRepository`），测试时可替换。
- 带 id 的详情页 VM：`viewModel(key = "article_$blogId") { ArticleDetailViewModel(blogId) }`。
- 注意：`var mode`（private set）与 `fun setMode()` 会 JVM 签名冲突，方法名换一个词。

## 3. 后端接口与「坑」（务必牢记）

### 3.1 通用
- 生产 API：`https://hanphone.cn/api/`（nginx 剥掉 `/api` 前缀）
- 所有接口返回 `Result<T>`：`{ flag, code, message, data }`
- 写接口（评论/留言/友链申请）为幂等：需带 `X-Request-Id` 头（`ApiClient.newRequestId()`）

### 3.2 认证 — 最大的坑
- **登录/注册的密码必须先 `md5(明文)` 再发送**（与 `web/src/components/LoginForm.tsx`/`RegisterForm.tsx` 完全一致；后端 `checkUser` 校验的是 `bcrypt(md5(明文))`）。App 端工具：`util/Crypto.kt md5Hex()`。
- 登录响应 `data = { user, token, expire }`；`expire` 为 Date（毫秒数字或字符串），模型里用 **String?** 兼容两种。
- `User.type`：`"1"`=管理员、`"0"`=普通用户 —— **登录后必须存入 TokenStore.userType 并 DataStore 持久化**，消息页私信按它分流。
- **Token 头**：博客 REST 用请求头 `Token`（ApiClient 自动注入）；**聊天 REST 用 `Authorization: Bearer <token>`**（BlogApi 对应的 @GET 里手动带）。
- 401 自动登出：ApiClient 拦截器对带 Token 的 401 自动 `TokenStore.clear()`（避免“旧 token 卡死登录入口”）。
- 分页的 0/1 起始差异：
  - `/blogs`：`pagenum` 1 起始
  - `/types/{id}`、`/tags/{id}`：Spring `page` **0 起始**
  - `/essays`、`/messages`：`page` 1 起始
  - 仓库层已统一为 1 起始（内部转 0 起始）。

### 3.3 评论 / 点赞
- 文章评论：**登录后评论**（对齐网页版 CommentForm——网页未登录时表单禁用并引导登录）。App 文章详情页底部为**输入条**（点赞 + 输入胶囊 + 发送 + 分享，键盘弹出自动上浮），未登录点发送→提示"请先登录"+去登录；请求带 `userId`（后端取本人资料），**无昵称/邮箱输入**（`repo.postCommentAsUser`）。旧匿名（nickname+email）请求仅后端兼容保留，App 不再使用。
- **文章评论回复**（对齐网页版）：**点击评论内容即回复**（无独立回复按钮，纵向更紧凑），输入条顶部出现「回复 @xxx」小条 + ✕ 取消；提交带 `parentId`（`postCommentAsUser(...parentId)`）；后端 Comment 的 `parentComment` 被 `@JsonIgnore`（列表不回传父级），新回复的「回复 @x」标签由 UI 本地 `replyHints` 记录展示，历史回复呈扁平列表（与网页 GET 行为一致）。**评论内容可长按选中复制**（`SelectionContainer` + `detectTapGestures` 共存：点=回复、长按=选择）。
- 随笔评论：**必须登录**（body `userId`）；**列表项与详情页均支持回复**（`parentCommentId` 楼层回复，弹窗「回复 @昵称」）。
- 点赞（文章/随笔）：需登录，body `{ userId, blogId/essayId, isLike }`。
- 随笔评论 POST `/essays/{id}/comments` 也需要 `X-Request-Id`。

### 3.4 上传（admin-file）
- `POST https://hanphone.top/upload/avatar`（免鉴权，multipart 字段 `avatar`，≤5MB，IP 限频）→ `{ code, message, url }`。`FileApi` 独立 Retrofit（域名不同、无 /api 前缀）。

### 3.5 聊天（hanphone-chat）— 协议
- Socket：`https://hanphone.cn` + path `/chat-api/socket.io`（socket.io v4 / EIO=4）。
- 连接后 10 秒内发 `authenticate(blogJWT)`，否则被断开。
- 公共聊天室事件：`requestPublicHistory`→`publicHistory`；`publicMessage`→`publicMessageBroadcast`；`publicOnlineCount`；AI：`publicAiStreamStart/Chunk/End/Error`（@寒枫 触发）；`messageDeleted`。
- 私信事件：`userMessage`（普通用户发给管理员）、`adminMessage(userId, content)`（管理员回）、`message`（收到私信）、`userListUpdated`（管理员在线用户）。
- **已读回执**：进入会话即 emit `markConversationRead(peerUserId)`（普通用户=1000，管理员=对方 userId）；收到 `conversationRead { peerUserId, readUpToMessageId }` 时把自己发给对方、`id<=readUpToMessageId` 的消息标已读（`ChatSocket` 单例内存缓存 + 修订号 `privateCacheRevision` 驱动 UI 刷新）。管理员收件箱未读数 = REST `GET /chat-api/api/users/unread`（60s 节流）+ socket 新消息实时增量（未在查看该会话时 +1、查看时即时标记已读）。协议见 `docs/chat/android-protocol.md`。
- 私信 REST（**Bearer**）：普通用户 `GET /chat-api/api/messages/admin`；管理员 `GET /chat-api/api/users/all` + `GET /chat-api/api/messages/{userId}` + `GET /chat-api/api/users/unread`。
- **管理员 vs 普通用户**：`/messages/admin` 对管理员返回 403；`/users/all` 对普通用户返回 403 —— 所有这类调用必须 try/catch，否则 Retrofit HttpException 会崩掉整个 App。

### 3.6 留言板（对齐网页版：不填昵称、支持回复）
- 网页版 `useMessages.publish` 里作者 = 登录 `nickname`，未登录固定 `"匿名用户"`，**无语名输入框**。
- App 留言板**底部输入条**（同文章评论输入条，未登录时条内小字提示"将以「匿名用户」身份留言"）；作者 = 登录昵称 ?: `"匿名用户"`，头像 = 登录头像（`repo.postMessage(nickname, content, avatar, parentId)` 已支持）。
- **留言回复**（对齐网页版）：**点击留言内容即回复**（无独立回复按钮），底部输入条顶部出现「回复 @xxx」+ ✕ 取消；后端 Message 会**内嵌返回 `parentMessage`**（非 @JsonIgnore），列表直接展示「回复 @父昵称」标签。**留言内容可长按选中复制**。

## 4. 信息架构与每屏要点（含用户明确要求）

### 首页
- 顶部 = 搜索单元（搜索 + 右侧漏斗 IconButton）；**无独立分类栏**——分类已并入筛选面板。
- **已选筛选行**：有激活筛选（分类/标签/年份）时漏斗按钮**主色高亮 + 右上圆点**，搜索栏下方横排**InputChips**（`分类:xx ✕` / `标签:xx ✕` / `xxxx年 ✕`，可单个移除）+「清除」SuggestionChip（无筛选时不占位）。
- 点漏斗 → **筛选面板从搜索栏下方向下展开**（AnimatedVisibility expandVertically），是**覆盖层**（`zIndex`、`offset(58.dp)`，放在内容 Box 之外）——**不参与布局、不顶动内容**。
- 面板规范：**不透明、无卡片边界（无圆角/无边框）、内部横排 chips**；打开时**下方整屏半透明遮罩（35%）盖住博客内容，点击遮罩关闭**（小红书式）。
- 面板内容按**小节标题分组横排**：视图（最新/归档）、排序（最新/最早/推荐/最多/最少阅读）、**分类（全部 + 各类型，带分类色点）**、标签、年份（归档时）；有筛选时底部「重置筛选」。
- 归档已并入首页（视图=归档时显示按年列表；选中年份过滤）。**没有独立归档页**。

### 随笔 = 朋友圈（去卡片化）
- **无 Card/容器**：扁平条目，头像（圆角方形 8dp）最左 → 蓝色昵称 → 正文（>90 字出现「全文」展开）→ 图片九宫格（单图 max 60%、2-3 一行、多图 3 列）→ 底部：小字时间 + **灰底胶囊操作条**；**条目之间以细分割线分隔**（`HorizontalDivider` 插在同一条目 item 内 `index>0` 时渲染、上下各 4dp、条目间隔 `spacedBy(6.dp)`、列表内容 padding 上下 6dp——保持紧凑的「分割页」不留太多空白）。
- **胶囊操作条三个按钮均为纯图标**（无文字，内容描述供无障碍）：赞（`Favorite/FavoriteBorder`）、写评论（`Create`）、评论折叠/展开（`Email`）。图标可点击区域 18dp/段内 8dp。**没有评论的随笔不再渲染评论区**（不显示"还没有评论"空态；评论数据经 VM `essayComments` 到达后自动出现）。
- 点「评 N」→ 评论区**默认展开加载**（LazyColumn 可见项自动拉取评论，VM 内存缓存防重复请求）；评论过多时默认折叠显示前 5 条 + 「展开全部评论（N 条）」；胶囊按钮在展开时显示「收起评论」，可整区折叠/展开。**评论输入不在评论区内部**：胶囊条另有独立「写评论」按钮（与折叠/展开按钮不同），点击后在**页面底部弹出输入条并自动拉起键盘**（复用 `CommentInputBar` + `autoFocus`），评论数据收在 VM（`essayComments` 状态 map），提交后即时回显；点某条评论同理在底部输入条进入「回复 @昵称」模式。随笔详情页仍用弹窗输入（`EssayCommentDialog`，`minLines=2`）。
- **输入草稿缓存**：文章评论 / 留言板 / 随笔内嵌与弹窗评论输入均按场景分键存入 DataStore（`core/Settings.kt` 的 `draftFlow/saveDraft`，kind 如 `article_comment_{id}` / `message_comment` / `essay_comment_{id}` / `essay_detail_comment_{id}`）；输入停顿约 400ms 落盘、发送/清空即删；**不随「数据管理 → 清除全部」删除**。
- **首进不弹下拉圈圈**：`PullToRefreshBox.isRefreshing = refreshing && userPulled`（首屏冷加载/骨架不弹 Refresh 圈，仅用户主动下拉才有）。
- **图片用缩略图，不要用原图**：`EssayFileUrl.displayUrl()` 给列表九宫格用（优先 `thumbPath`，缺失回退 `url`），`originalUrl()` 给详情页大图用。原图单张可达 12MB、单篇最多 9 张（实测合计约 40MB），直出会同时打爆 App 和 2C2G 的服务器。老数据与外链附件 `thumbPath` 为 null，自动回退原图，行为与改造前一致。
- **url_type 是大写**：`essayFileUrls` 的 `urlType` 实际取值是 `IMAGE`/`VIDEO`/`TEXT`/`OTHER`（全大写）。判断视频必须用 `equals("video", ignoreCase = true)`，写成 `!= "video"` 条件恒为真，视频会被当图片丢进 `AsyncImage`。

### 消息 = Hub
- 公告横幅（顶部）+ `TabRow[聊天室 | 私信]`。
- **私信按 `TokenStore.isAdmin` 分流**：普通用户 = 与「寒枫（博主）」单聊（`/messages/admin` + `userMessage`）；管理员 = **用户收件箱**（`/users/all` + socket `userListUpdated`，在线绿点）→ 点入用户会话（`/messages/{userId}` + `adminMessage`，带返回）。
- 断连/异常时给「重新连接」按钮。
- **本地缓存**：聊天室历史（`chat_public.json`）+ 私信会话（`chat_private_{admin|u{id}}.json`）+ **私信用户列表**（`chat_users.json`，管理员收件箱秒显）存 ContentStore；进入消息页先秒显缓存，socket 连接在后台刷新（`ChatSocket.restoreMessages` + 写缓存节流 5s、断线强制落盘）。**首进不再全屏「连接中」**，仅顶部细横幅提示。
- **notification toast 过滤**：服务端每次连接都会发 `notification:"认证成功，已连接到聊天服务器"`（server.ts:519），已在 `ChatSocket` 源头过滤（`startsWith("认证成功")` 不进入 notice），避免每次进消息页/重连都弹认证成功 toast；其余错误/操作类 notification 仍会保留提示。

### 我的 / 设置
- 「我的」= 概览：头部、登录态卡、站点统计、**更多入口（照片墙/项目/文库/留言板/友链/设置）**；关于信息已移入设置页。
- **照片墙入口**（「我的」→ 更多）：用通用 WebView 打开 `https://hanphone.cn/atlas/`（nginx alias 托管，页面自带瀑布流/便利贴/时间线展示与筛选），路由复用 `webview?url=...`（`App.kt` 的 `onOpenPhotoWall`）。登录态由 `core/AuthBridge.kt` 注入，与 App 共用（详见坑点 15）。
- **照片墙页面有独立加载态**：`Atlas.vue` 早期只有空态没有加载态，`atlasData` 初始 `[]` 导致接口返回前先闪「没有符合筛选条件的照片」。App 里必现——每次进入都是全新页面实例，而 WebView 的 `sessionStorage.atlasWelcomeShown` 会持久化，第二次起欢迎页被跳过，没有东西遮挡这段空窗（`/show` 冷启动实测约 2.3s）。已加 `isLoading`（初值 `true`，只在 `finally` 置 `false`）。**WebView 侧改这类「异步数据 vs 空态」时注意同样的坑**。
- 「项目」= 独立页：类型筛选 chips（全部/完整项目/工具箱/小游戏/小练习）+ 分组卡片（完整项目=大卡片、其余=双列网格；推荐角标、技术栈标签），数据来自 `GET /projects`（推荐在前、type 分组，与 web ProjectClient 一致）；点击卡片用 **WebView** 内开项目链接（`ui/webview/WebViewScreen.kt`：JS 开启、加载进度条、系统返回先回退 WebView 历史、右上角菜单可在浏览器打开）。
- 「文库」= 独立页：数据来自 `GET /docs`，按 `docNamespace` 构建文件夹树（`blog/docs/子目录` → 顶层文件夹，对齐 web DocLoader）；文件夹浏览 + 面包屑、名称/路径搜索、类型筛选 pills（Word/PDF/MD/HTML 带计数，对齐 web DocsFilter）；文件行 = 彩色类型徽标 + 名称 + 推荐星 + 日期；打开文件：**HTML → WebView**、**MD → 应用内 Markdown 预览**（`DocMarkdownScreen`，文件服务原文去 frontmatter 后渲染）、**PDF/DOCX → 系统打开/下载**；文件 URL = `https://hanphone.top/{docNamespace}/{文件名}` 逐段 URI 编码（`util/buildDocFileUrl`），打开即上报浏览量 `POST /docs/{docId}/view`。
- 「设置」= 入口列表：**外观**（→子页：主题:跟随系统/白日（浅色）/黑夜（深色）；自定义背景:相册选图→私有目录→全局背景层 + 模糊 0-25 滑块 + 清除）+ **数据管理**（→子页：按功能/页面分项显示占用并一键清除：首页·统计/随笔/留言板·友链/项目/文库/**图片缓存（Coil 磁盘+内存）**/消息聊天；单项清除即时生效、`清除全部` 弹确认框并连图片缓存一起清，仅清本机缓存不影响服务器）+ **检查更新**（行内点击检查，副标题显示当前版本号）+ **关于**（App 图标/名称/简介 + 访问博客网站/GitHub 链接）。外观/数据管理是独立子页（路由 `settings/appearance`、`settings/data`），设置页只放入口避免过长。**账号区已删除**（「我的」页已含登录态/退出/资料编辑）；访客头像上传同步移除（匿名留言不再可配置本地头像）。
- **资料编辑**（「我的」点头像，对齐网页 UserInfoForm）：昵称 + 头像 + **邮箱**（改邮箱需向新邮箱发通用验证码 `scene=general`，非管理员必填；管理员免验证码）+ **新密码**（可选，≥6 位含字母数字，`md5` 传输）。保存走 `POST /user/current/update`（body 根级带 `captcha`），后端 `UserServiceImpl.updateCurrentUser` 会对 `user.password` 做 bcrypt。
- 「设置 → 关于」：**博客图标**（`R.drawable.ic_blog`，取自 web PWA icon-512）徽标 + App 名 + 单行简介 + 链接行（**访问博客网站 hanphone.cn / 作者 GitHub**），点击走系统浏览器。版本号只在「检查更新」区显示一次（不重复）。
- **检查更新**（设置→检查更新）：读 `https://api.github.com/repos/HanphoneJan/hanphone-blog/releases/latest`（tag 语义化比较 `isNewerVersion(tag, BuildConfig.VERSION_NAME)`，取 .apk 资产 URL），有新版弹「发现新版本 vX + Release 说明 + 去更新(浏览器下载 APK)/稍后」，无新版 toast「已是最新版本」。API 与下载链在**直连网络可用**。⚠️ 因为是语义化比较，**同版本号重新发布 APK 不会让已装用户收到更新提示**——要让用户升级必须同时抬 `versionCode`。
- **发布渠道**：GitHub Release `v{versionName}`（debug 密钥签名的 release APK，`assembleRelease` 已配 `signingConfig = debug`，可覆盖升级；正式签名留 S5）。
- **占位图规范**：未登录头像/登录页/注册页/关于徽标一律用 `R.drawable.ic_blog`（CircleShape 裁剪），**不再用文字「云」**。

### 登录 / 注册
- 登录：用户名+密码（**md5**），成功即保存 `AuthData(token,userId,nickname,avatar,userType)`。
- 注册：用户名/昵称/邮箱/密码/邮箱验证码（`sendCaptcha scene=register`，60s 倒计时，密码≥6 且含字母数字），成功自动登录。

## 5. 主题与视觉规范（用户明确偏好，勿擅自改）

- **只有两套主题**（Light / Dark），主色 #2C7BE5 派生，MD3 色彩角色齐全。**不要加第 3、4 套**。
- **紧凑返回栏 `AppBackBar`**：所有子页统一 44dp（替代 M3 TopAppBar 的 64dp，含状态栏后更省空间）；搜索条 `SearchField` 40dp 胶囊（项目/文库/搜索页）。新增页面用这两个组件，勿再引入 TopAppBar/56dp OutlinedTextField 搜索框。
- 配色避免“整体偏灰”：Light 用清爽蓝白（`background #F2F6FB`、`surface #FFFFFF`、容器蓝调）。
- 底部导航：**自定义 Surface+Row**（内容区 54dp + `windowInsetsPadding(navigationBars)` 手势区有底色；图标 24dp、文字 11sp、图标与文字间距 2dp；选中主色）。
- 按钮/输入框偏紧凑：输入框 48dp、主按钮 38dp、聊天输入单行 46dp、弹窗正文 minLines=2。
- **图标/资源优先复用网站**：封面 `firstPicture || type.pic_url`、分类色点 `type.color`、`essayFileUrls` 图、友链头像、启动图标 = 网站 PWA `icon-512x512.png`（**图标放自适应安全区内约 62%，背景白**，勿满幅缩放/勿蓝底）。
- 交互相容：下拉刷新、列表无限滚动、Toast 轻提示、系统返回优先。

## 6. 开发环境（本机 Linux）

```bash
# 构建（必须带代理 GRADLE_OPTS：Gradle 发行版走 github 需代理，依赖仓库直连）
export GRADLE_OPTS="-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=10808 -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=10808"
./gradlew :app:assembleDebug --no-daemon

# 装机 + 验证
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.hanphone.blog/.MainActivity
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml   # 看渲染文本
adb logcat -d | grep -i "FATAL EXCEPTION"                                   # 崩溃检查（必须 0）
```
- SDK：`~/Android/Sdk`（`local.properties` 指向），JDK 21。
- 真机：realme（`adb devices` 可见即 `device` 状态）。用 `uiautomator` 的 `bounds` 算中心点做点击。

## 7. 踩坑记录（前车之鉴）

1. **登录失败**：一直发明文密码 → 应为 `md5(明文)`。（最高频）
2. **“无法登录”**：旧 token 卡登录入口 → 401 自动登出修复。
3. **私信崩溃**：`retrofit2.HttpException: HTTP 403` —— 管理员账号调普通用户接口；**网络请求必须 try/catch**。
4. **聊天“连接失败”**：重构时丢掉 `LaunchedEffect(token){ ChatSocket.connect }` —— 每进入 hub 必须有连接钩子。
4a. **整 App 卡加载**：VM 化重构时丢掉了页面里的 `LaunchedEffect(Unit){ load() }` **首次加载调用**——VM init 只读缓存不发请求，所有列表页永远停在骨架屏。规矩：每个 VM 的 `init` 必须自己发起首载，改完用 logcat 确认请求真的发出（`adb logcat | grep okhttp`）。
5. **筛选面板误解**：用户说“从上往下”= 从搜索栏向下弹出（overlay+遮罩），**不是**改内部为纵向列表。
6. **App 图标 vs PWA 图标（maskable 行为，重大）**：自适应图标前景是**整张画布铺到桌面，圆遮罩只显示中央 ~61%**。
   - 直接把 PWA 图标当前景（logo 68% 画布）→ 遮罩内 **>100% 被裁切**，看起来"过大/残"；
   - 按安全区缩小到 42% → 遮罩内 ~63%，但**比 PWA 安装图标偏小**（新手常见）；
   - **与 PWA 一致的正确做法**：装 PWA 时 Chrome 生成 WebAPK，用 **maskable 图标全出血铺满前景 + 白背景**，且 Chrome 预生成的前景里 logo 占 **~52%** 画布、四周透明 → 遮罩内 ≈85%。
   - **复刻方法**：`adb pull` WebAPK 的 `res/mipmap-nodpi-v4/maskable_app_icon_xxxhdpi.png` 量出 logo 占画布比例 → 用 ffmpeg「透明 1024 底 + 原图缩放到 logo=该比例」生成 `ic_launcher_fg.png`（背景层保持白）。验证：装后截图，`ffmpeg` 解码量「白面内 logo 占比」≈ 77-84% 即与 PWA 一致。
   - 一句话：**别调大小碰运气——直接提取 WebAPK 图标抄比例**。旧备注「白底+62% 安全区」作废。
7. **底部导航遮挡/偏灰**：别用默认 NavigationBar 高度 hack；用自定义 Surface+Row，手势区给底色。
8. **Kotlin/Compose 易错点**：
   - 委托属性（`by remember`）不能直接 smart cast（用 `!!` 或局部变量）
   - `Modifier.weight` 只在 Row/Column/Box **内容作用域**里可用
   - 扩展成员放进 `object` 无法被外部 import —— 写顶层扩展
   - `KeyboardOptions` 在 `androidx.compose.foundation.text`（不是 ui.text.input）
   - `LocalView.current` 只能在 @Composable 里取（先存局部变量再给普通函数用）
   - 大段重构容易弄丢花括号/回调/LaunchedEffect —— 改完先编译再装机
   - import 写错包名/重复 import 是高频编译错（改完自查 import 块）
9. **验证闭环**：每次改完 = 构建 SUCCESS → 装机 → uiautomator 看关键文本/位置 → 崩溃检查 = 0。
10. **例行状态别当通知弹**：聊天 socket 每次连接服务端都会发 `notification:"认证成功…"`（server.ts:519）——已在 `ChatSocket` 源头过滤（`startsWith("认证成功")` 不进 notice）；且 `StateFlow.collect` 进页会**重放当前值**，收集通知要用 `notice.drop(1)`，否则每次进消息页重弹上次通知。
11. **Coil 缓存管理（设置页数据管理）**：图片缓存不进 ContentStore（它在 App 缓存目录），数据管理单独统计/清除 `LocalImageLoader.current` 的 `diskCache.size/clear() + memoryCache.size/clear()`。坑：`MemoryCache.size` 是 **Int**（与 `?: 0L` 合并会类型漂移成 Number 编译错，需 `.toLong()`）；`DiskCache.clear()` 是 suspend。
12. **图片占位**：未登录头像/登录注册页/关于徽标统一用 `R.drawable.ic_blog`（拷贝自 web `icon-512x512.png`）——别用文字「云」当占位。
13. **列表图片一律走缩略图**：随笔九宫格用 `displayUrl()`，详情页大图才用 `originalUrl()`。原图单张可达 12MB、单篇最多 9 张（约 40MB），Coil 会把磁盘缓存撑爆且拖垮 2C2G 的服务器。服务端（admin-file）上传时已生成 320w/800w/1600w WebP，前端只要带上 `thumbPath` 就够了。
14. **照片墙是 WebView，不是原生页**：`https://hanphone.cn/atlas/` 由 nginx alias 托管的 Vue SPA，图片走浏览器内核加载 + Service Worker 缓存，**不受 App「数据管理 → 图片缓存」控制**。登录态通过 `core/AuthBridge.kt` 注入（见下条），不再各存一份。

15. **第一方 WebView 页面必须注入 App 登录态（`core/AuthBridge.kt`）**：
    - 照片墙的登录态存在**它自己的 localStorage**（`token` / `userInfo` / `expire`），与 App 的 DataStore 是两套互不相通的存储。不注入就会出现「App 里退出登录、照片墙仍显示已登录还能点赞/进管理页」。
    - 用 `WebViewCompat.addDocumentStartJavaScript`，**不是** `onPageFinished` + `evaluateJavascript`：照片墙的 Pinia store 在模块初始化时**同步**读 localStorage（`apps/photo-wall/src/store/store.ts`），晚一拍就来不及了。需 `androidx.webkit`（已加，`libs.versions.toml` 的 `webkit = 1.12.1`），WebView < 83 走 `evaluateJavascript` + `reload()` 降级。
    - **只对 `AuthBridge.FIRST_PARTY_ORIGINS`（`hanphone.cn` / `www.hanphone.cn`）生效**。项目页会打开任意外链，加白名单前想清楚：进去的域名就等于拿到用户 token。
    - App 未登录时脚本是**删除**这三个键（不是跳过）——否则用户在照片墙里单独登录过、之后又在 App 退出，照片墙会一直带着旧 token。
    - 登出入口在 `ProfileScreen` 的「退出」：`clearAuth()` + `TokenStore.clear()` + **`AuthBridge.clearWebStorage()`**。用 `WebStorage.deleteAllData()` 而不是 `evaluateJavascript("localStorage.clear()")`：后者要求 WebView 实例存活，而登出时页面往往已销毁；`WebStorage` 也不会误删 Cache Storage（Service Worker 资源缓存）。
    - **历史坑（已修，别再踩）**：早期没有注入，但照片墙却显示「已登录」，看起来像注入已经存在。真相是照片墙**自带的登录页**在 WebView 里被用过一次，`domStorageEnabled = true` 让 localStorage 按 origin 持久留在 App 数据目录里。**`domStorageEnabled=true` 意味着 WebView 里的状态会跨会话存活**，排查「为什么它记得我」时先想到这条。
    - 注入的 `userInfo` 需要 `id` / `type` / `username` / `nickname` / `avatar` 五个字段。其中 `username`（登录名，非昵称）App 原本**没存**——为此给 `AuthData` 加了 `username` 字段并落到 DataStore，登录/注册/改资料三处都要传。漏了会导致照片墙管理页按登录名定位不到当前用户。
    - ⚠️ **别踩这个顺序坑**：`context.auth.collectAsState(initial = AuthData())` 的 `initial` 必须写成 **`null`**，不能用 `AuthData()` 兜底。否则首帧 `currentAuth` 是空的 → 注入脚本按「未登录」生成（删除三个键）→ 紧接着 `loadUrl` 加载 → **页面带着清除登录态的脚本加载完成，App 明明已登录但照片墙显示未登录**，要进第二次才对。正确写法：用 `null` 表示「还没读到」，把注入和加载都 gate 在 `authResolved` 上，且注入的 `LaunchedEffect` 必须声明在加载的**前面**（Compose 按声明顺序启动，`install()` 又是同步调用）。同理**不要在 `AndroidView` 的 factory 里注入**——那里执行时 DataStore 大概率还没吐值。

## 8. 路线图

- ✅ 已完成：信息架构(4Tab)、登录(md5)/注册、点赞评论、随笔朋友圈+评论回复、搜索、归档并首页、筛选面板（覆盖式/遮罩/非卡片）、消息 Hub（聊天室/私信+管理员分流）、留言板、友链、设置页、双主题、自定义背景+模糊、头像上传、网站图标、骨架屏、三层缓存、心跳修复、ViewModel+Hilt、Moshi、随笔 Paging 3 + 冷启动缓存、私信本地通知。
- ✅ 项目页 + 文库页（WebView 内开 HTML、fetch+loadDataWithBaseURL 渲染）、通用 WebView、文档/项目/文库/聊天(Chat 历史+私信+用户列表) 本地缓存、数据管理（分项清除 + Coil 图片缓存）、账号编辑（邮箱+验证码+管理员免验、密码 md5）、体验打磨（去认证成功 toast、@用户名防抖、随笔秒显、下拉圈圈门控）、版本 v1.0.0、App 图标与 PWA maskable 图标一致（ic_launcher_fg 复刻 WebAPK 52% 比例 + ic_blog 占位）。
- ✅ 随笔图片缩略图（九宫格走 `displayUrl()`，详情页走 `originalUrl()`；21 张图 74.65 MB → 0.75 MB，100×）、修掉 `urlType != "video"` 大小写导致视频被当图片加载的 bug。详见 `docs/photo-wall-image-optimization.md`。
- ✅ 第一方 WebView（照片墙）登录态打通：`core/AuthBridge.kt` 在文档开始时把 App 的 DataStore 登录态注入页面 localStorage（仅 `hanphone.cn` 白名单），登出时同步清理；`AuthData` 补 `username` 字段。
- ⏭ 下一步候选：S5 release 签名 + R8（启用混淆需补 Moshi 反射 proguard 规则）。
- 技术债：Markdown 渲染器可换成熟库；私信 AI（toAi）未做；首页分页仍是手写（客户端排序+多筛选源与 Paging 3 模型冲突，暂保留）。

## 10. 关键技术决策（本次重构后）

1. **DI**：Hilt（@HiltAndroidApp/@AndroidEntryPoint/@HiltViewModel）；详情页 id 走 `SavedStateHandle["blogId"/"essayId"]`，不再手写 factory/key。
2. **JSON**：Moshi + KotlinJsonAdapterFactory（非空字段缺失直接抛错，替代 Gson 的静默塞 null）；Date 兼容适配器在 `ApiClient.BlogDateAdapter`（毫秒数字/ISO/普通日期）；模型注解用 `@Json(name=...)`（原 Gson @SerializedName 已迁移）。
3. **分页**：随笔列表用 Paging 3（`EssayPagingSource`，key=1 起始页码，`paging-compose` 的 collectAsLazyPagingItems + itemKey + loadState 驱动骨架/页脚/重试）。**冷启动缓存**：第一页成功即写 `MemoryCache.essayMoments` + `ContentStore.writeEssayFirstPage`，进入列表页时 Paging 首屏未到前先用缓存秒显（`EssayListViewModel.coldFeed`），数据到达后键一致无缝替换——不再进场闪骨架屏。
3a. **缓存层扩展（加载体验专项）**：ContentStore 新增 types/tags/archive、essay_comments_{id}、article_{id}(+_comments)、essay_{id}、doc_{hash}(文库 MD/HTML 原文 24h TTL)、enrich_attempts(友链补全节流)，均并入数据管理分项清除；MemoryCache 新增 homeTypes/homeTags/archiveBlogs + 搜索结果缓存(5min/同词去重)。消息页私信历史与管理员用户列表状态迁入 ChatSocket 单例（REST 私信 30s/用户列表 60s 节流，Tab 切换/进出会话不再重建丢态、不重复拉）。首页 selectedYear 入 VM、loadLatest generation 防筛选竞态；搜索输入即搜+350ms 防抖（对齐 web）；留言板发送后本地回显 addMessageLocal（对齐 web ADD_MESSAGE）；文章/随笔详情正文+评论与文库原文落盘冷启动秒显。
4. **Markdown**：mikepenz/multiplatform-markdown-renderer 0.31.0（m3 + coil2 + **code 高亮模块**）。`Markdown.kt` 只是薄封装：预处理（HTML 实体解码 + 相对 URL 绝对化）→ `Markdown(...)`。代码高亮 = `markdownComponents(codeFence/codeBlock → MarkdownHighlightedCodeFence/Block)`，Atom 主题随深浅色（`surface.luminance()` 判断）；表格列宽 `markdownDimens(tableCellWidth = 220.dp)` 让宽表自动进入横向滚动（库内建，列少时会 fillMaxWidth 不滚）。typography 必须覆盖：库默认 h1=displayLarge(57sp) 巨大，已按 web blog.css 收敛为 26/22/19/17sp。
5. **文章详情导航**：正文按块级切分渲染（`splitMarkdownBlocks`），标题块 itemIndex 即锚点；TOC 入口 = 详情页右下角 SmallFloatingActionButton → ModalBottomSheet 列表 → `animateScrollToItem(blockIndex + 1)`（+1 跳过头部 item）。顶部 LinearProgressIndicator 显示阅读进度（firstVisibleItemIndex 占比）。
4. **部署 hanphone-chat**：本机 `ssh blog` 免密（公钥已装）；源码在仓库 **`chat-server/`**（原 `~/server_chat/src`），pm2 进程名 `hanphone-chat-server`（跑 dist，改完需 `pnpm --filter chat-server build` 再 `pm2 restart hanphone-chat-server`）。协议变更先看仓库 **`docs/chat/android-protocol.md`**。

## 9. 给新 AI 的规矩（Rulebook）

1. **先读网页再动手**：任何接口/交互先看 `web/` 与 `hanphone-chat/` 的代码，按网站行为实现。
2. **逐条解析需求**：用户说“面板从上往下”先确认是“弹出方向”还是“内部排列”，再动手；不确定就问。
3. **保持既有规范**：双主题/非卡片化筛选/朋友圈随笔/紧凑控件/网站图标 —— 别“顺手美化”成别的风格。
4. **安全第一**：所有网络调用 try/catch；聊天连接钩子保留；分页/认证参数查第 3 节表。
5. **改完必验**：构建→装机→uiautomator→崩溃检查，一条不能少。
6. **聊天心跳**：服务端 60s 无 `heartbeat` 事件强制断连（Web 端 25s 发一次）——App 端 `ChatSocket.startHeartbeat()` 已实现，**连接成功后必须启动心跳**，否则约 1 分钟必掉线（表现为"连接失败/历史消息加载失败"循环）。
7. **401 拦截器**：`ApiClient` 401 清登录态仅对博客 API 生效；`chat-api`（独立服务，鉴权失败原因不同）的 401 **不能**清 `TokenStore`，否则聊天偶发失败会把用户登出。
8. **UI 组件尺寸**：M3 `OutlinedTextField` 最小 56dp、`Button` 最小 40dp，不要强制更小（label 会被挤压）；小字标签用 `labelSmall`（自带 16sp 行高），只改 `fontSize` 会继承 bodyLarge 的 26sp 行高导致间距过大。聊天输入栏用 `BasicTextField` 胶囊（44dp）。
9. **加载体验**：新页面首载用骨架屏（`ui/components/Skeleton.kt`，勿用全屏转圈）；列表/详情返回秒显靠 `MemoryCache` + 静默刷新；"我的"页支持下拉刷新。
9a. **长按选择文字**：正文/评论/留言等可读文本统一包 `SelectionContainer`（博客正文按块、随笔正文、评论/留言内容）；「点内容=回复」的评论/留言内容用 `Modifier.pointerInput { detectTapGestures { ... } }` 与 `SelectionContainer` 共存（点=动作、长按=复制）。
13. **网页版文库能看、App WebView 白屏**：文件服务（admin-file，hanphone.top）对所有文件响应带 `Content-Disposition: attachment`——WebView 直接 `loadUrl` 会把页面当**下载**，主框架 200 后立刻跳 `about:blank` 白屏（`onPageStarted` 不触发、子资源不加载、无 onReceivedError）。**修复：先 fetch 文件文本再用 `loadDataWithBaseURL(baseUrl=文件目录, html, "text/html","utf-8",null)` 渲染**（网页版 docLoader 也是 fetch 字节渲染，不是直接导航）。文库 .md 预览同理会 fetch 文本。判断「附件下载 vs 页面」看响应头 `content-disposition`。
14. **Toast 原则**：非必要不弹。成功且 UI 已有可见反馈（列表插入新条目、点赞数字变化、头像预览更新）一律不弹；失败、表单校验、登录态提示才弹。聊天 socket 的连接失败走 ReconnectBanner，不发 toast。
15. **软键盘适配（重要，勿用裸 imePadding）**：Manifest 里 MainActivity `android:windowSoftInputMode="adjustResize"`。Scaffold 已按系统 insets 预留底部导航栏空间，若对底部输入再直接 `imePadding()` 会「双抬升」——键盘上方出现整段导航栏高的空白（曾出现 ~1200px 缝隙）。统一改为 `imeLiftAboveKeyboard()`（`ui/components/Common.kt`，= `(IME − 导航栏) 内边距` 差值，键盘弹出时恰好贴齐键盘顶），覆盖场景：
   - 文章评论 / 留言板底部输入条（`CommentInputBar`）
   - 随笔列表容器（`Box(...imeLiftAboveKeyboard())`，内嵌评论胶囊输入不被键盘遮挡）
   - 聊天会话页 `Column`（主 Tab，键盘弹出时底部导航栏自动隐藏——`App.kt` 里 `imeVisible` 判断 `WindowInsets.ime`，避免主 Tab 底栏占位挡住输入；消息 Hub 的**聊天室**与**私信**两个输入栏都要加）
   - 登录/注册表单容器（垂直居中表单上移）
   验证：`adb shell dumpsys window displays | grep 'type=ime'` 可查键盘顶位置，配合截图像素核对输入条是否贴齐。