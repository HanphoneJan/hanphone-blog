# 云林有风 Android 客户端 — AI 交接文档（HANDOVER）

> 用途：供**新接手 AI** 快速理解项目、规避前人踩过的坑。
> 位置：`apps/blog-android/`。配套文件：`PLAN.md`（路线图）、`README.md`（构建）、本文件（经验与规矩）。
> 铁律：**改动前先读 `web/`（网站前端）与 `~/develop-projects/hanphone-chat/`（聊天服务）作为接口与交互的“唯一事实来源”，不要凭直觉假设。**

---

## 1. 项目定位

博客「云林有风」的 Android 原生客户端。Kotlin + Jetpack Compose (Material 3)，对接博客 REST API 与 hanphone-chat 实时聊天。后端代码零改动。

- 导航：**底部 4 Tab**：首页 / 随笔 / 消息 / 我的
- 子页：文章详情、随笔详情、搜索、留言板、友链、设置、登录、注册
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
  profile/ProfileScreen.kt + ProfileViewModel.kt
  components/           ArticleCard/Avatar/Skeleton(骨架屏)/Loading/Error/Empty/BottomActionItem
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
- 文章评论：匿名需 `nickname`+`email`（必填），可带 `avatar`。
- 随笔评论：**必须登录**（body `userId`）；回复用 `parentCommentId`。
- 点赞（文章/随笔）：需登录，body `{ userId, blogId/essayId, isLike }`。
- 随笔评论 POST `/essays/{id}/comments` 也需要 `X-Request-Id`。

### 3.4 上传（admin-file）
- `POST https://hanphone.top/upload/avatar`（免鉴权，multipart 字段 `avatar`，≤5MB，IP 限频）→ `{ code, message, url }`。`FileApi` 独立 Retrofit（域名不同、无 /api 前缀）。

### 3.5 聊天（hanphone-chat）— 协议
- Socket：`https://hanphone.cn` + path `/chat-api/socket.io`（socket.io v4 / EIO=4）。
- 连接后 10 秒内发 `authenticate(blogJWT)`，否则被断开。
- 公共聊天室事件：`requestPublicHistory`→`publicHistory`；`publicMessage`→`publicMessageBroadcast`；`publicOnlineCount`；AI：`publicAiStreamStart/Chunk/End/Error`（@寒枫 触发）；`messageDeleted`。
- 私信事件：`userMessage`（普通用户发给管理员）、`adminMessage(userId, content)`（管理员回）、`message`（收到私信）、`userListUpdated`（管理员在线用户）。
- 私信 REST（**Bearer**）：普通用户 `GET /chat-api/api/messages/admin`；管理员 `GET /chat-api/api/users/all` + `GET /chat-api/api/messages/{userId}`。
- **管理员 vs 普通用户**：`/messages/admin` 对管理员返回 403；`/users/all` 对普通用户返回 403 —— 所有这类调用必须 try/catch，否则 Retrofit HttpException 会崩掉整个 App。

## 4. 信息架构与每屏要点（含用户明确要求）

### 首页
- 顶部 = 搜索单元（搜索 + 右侧漏斗 IconButton）；**无独立分类栏**——分类已并入筛选面板。
- **已选筛选行**：有激活筛选（分类/标签/年份）时漏斗按钮**主色高亮 + 右上圆点**，搜索栏下方横排**InputChips**（`分类:xx ✕` / `标签:xx ✕` / `xxxx年 ✕`，可单个移除）+「清除」SuggestionChip（无筛选时不占位）。
- 点漏斗 → **筛选面板从搜索栏下方向下展开**（AnimatedVisibility expandVertically），是**覆盖层**（`zIndex`、`offset(58.dp)`，放在内容 Box 之外）——**不参与布局、不顶动内容**。
- 面板规范：**不透明、无卡片边界（无圆角/无边框）、内部横排 chips**；打开时**下方整屏半透明遮罩（35%）盖住博客内容，点击遮罩关闭**（小红书式）。
- 面板内容按**小节标题分组横排**：视图（最新/归档）、排序（最新/最早/推荐/最多/最少阅读）、**分类（全部 + 各类型，带分类色点）**、标签、年份（归档时）；有筛选时底部「重置筛选」。
- 归档已并入首页（视图=归档时显示按年列表；选中年份过滤）。**没有独立归档页**。

### 随笔 = 朋友圈（去卡片化）
- **无 Card/容器**：扁平条目，头像（圆角方形 8dp）最左 → 蓝色昵称 → 正文（>90 字出现「全文」展开）→ 图片九宫格（单图 max 60%、2-3 一行、多图 3 列）→ 底部：小字时间 + **灰底胶囊赞/评条**。
- 点「评 N」→ **内嵌评论列表** + 内联输入发评论；**点某条评论 →「回复 @昵称」弹窗（带 parentCommentId）**。详情页评论同样可点回复。

### 消息 = Hub
- 公告横幅（顶部）+ `TabRow[聊天室 | 私信]`。
- **私信按 `TokenStore.isAdmin` 分流**：普通用户 = 与「寒枫（博主）」单聊（`/messages/admin` + `userMessage`）；管理员 = **用户收件箱**（`/users/all` + socket `userListUpdated`，在线绿点）→ 点入用户会话（`/messages/{userId}` + `adminMessage`，带返回）。
- 断连/异常时给「重新连接」按钮。

### 我的 / 设置
- 「我的」= 概览：头部、登录态卡、站点统计、**更多入口（项目/留言板/友链/设置）**、关于。
- 「项目」= 独立页：类型筛选 chips（全部/完整项目/工具箱/小游戏/小练习）+ 分组卡片（完整项目=大卡片、其余=双列网格；推荐角标、技术栈标签），数据来自 `GET /projects`（推荐在前、type 分组，与 web ProjectClient 一致）；点击卡片用 **WebView** 内开项目链接（`ui/webview/WebViewScreen.kt`：JS 开启、加载进度条、系统返回先回退 WebView 历史、右上角菜单可在浏览器打开）。
- 「文库」= 独立页：数据来自 `GET /docs`，按 `docNamespace` 构建文件夹树（`blog/docs/子目录` → 顶层文件夹，对齐 web DocLoader）；文件夹浏览 + 面包屑、名称/路径搜索、类型筛选 pills（Word/PDF/MD/HTML 带计数，对齐 web DocsFilter）；文件行 = 彩色类型徽标 + 名称 + 推荐星 + 日期；打开文件：**HTML → WebView**、**MD → 应用内 Markdown 预览**（`DocMarkdownScreen`，文件服务原文去 frontmatter 后渲染）、**PDF/DOCX → 系统打开/下载**；文件 URL = `https://hanphone.top/{docNamespace}/{文件名}` 逐段 URI 编码（`util/buildDocFileUrl`），打开即上报浏览量 `POST /docs/{docId}/view`。
- 「设置」独立页：账号（点头像上传头像、登录/退出）+ 外观（**主题：跟随系统/白日（浅色）/黑夜（深色）**；自定义背景：相册选图→私有目录→全局背景层 + 模糊 0-25 滑块 + 清除）。

### 登录 / 注册
- 登录：用户名+密码（**md5**），成功即保存 `AuthData(token,userId,nickname,avatar,userType)`。
- 注册：用户名/昵称/邮箱/密码/邮箱验证码（`sendCaptcha scene=register`，60s 倒计时，密码≥6 且含字母数字），成功自动登录。

## 5. 主题与视觉规范（用户明确偏好，勿擅自改）

- **只有两套主题**（Light / Dark），主色 #2C7BE5 派生，MD3 色彩角色齐全。**不要加第 3、4 套**。
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
6. **图标蓝边/截断**：自适应图标背景勿用蓝且前景勿满幅；白底 + 62% 安全区。
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

## 8. 路线图（详见 PLAN.md）

- ✅ 已完成：信息架构(4Tab)、登录(md5)/注册、点赞评论、随笔朋友圈+评论回复、搜索、归档并首页、筛选面板（覆盖式/遮罩/非卡片）、消息 Hub（聊天室/私信+管理员分流）、留言板、友链、设置页、双主题、自定义背景+模糊、头像上传、网站图标、骨架屏、三层缓存、心跳修复、ViewModel+Hilt、Moshi、随笔 Paging 3、私信本地通知。
- ⏭ 下一步候选：S5 release 签名 + R8（启用混淆需补 Moshi 反射 proguard 规则）。
- 技术债：Markdown 渲染器可换成熟库；私信 AI（toAi）未做；首页分页仍是手写（客户端排序+多筛选源与 Paging 3 模型冲突，暂保留）。

## 10. 关键技术决策（本次重构后）

1. **DI**：Hilt（@HiltAndroidApp/@AndroidEntryPoint/@HiltViewModel）；详情页 id 走 `SavedStateHandle["blogId"/"essayId"]`，不再手写 factory/key。
2. **JSON**：Moshi + KotlinJsonAdapterFactory（非空字段缺失直接抛错，替代 Gson 的静默塞 null）；Date 兼容适配器在 `ApiClient.BlogDateAdapter`（毫秒数字/ISO/普通日期）；模型注解用 `@Json(name=...)`（原 Gson @SerializedName 已迁移）。
3. **分页**：随笔列表用 Paging 3（`EssayPagingSource`，key=1 起始页码，`paging-compose` 的 collectAsLazyPagingItems + itemKey + loadState 驱动骨架/页脚/重试）；随笔不再做冷启动缓存（与 Paging 模型冲突）。
4. **Markdown**：mikepenz/multiplatform-markdown-renderer 0.31.0（m3 + coil2 + **code 高亮模块**）。`Markdown.kt` 只是薄封装：预处理（HTML 实体解码 + 相对 URL 绝对化）→ `Markdown(...)`。代码高亮 = `markdownComponents(codeFence/codeBlock → MarkdownHighlightedCodeFence/Block)`，Atom 主题随深浅色（`surface.luminance()` 判断）；表格列宽 `markdownDimens(tableCellWidth = 220.dp)` 让宽表自动进入横向滚动（库内建，列少时会 fillMaxWidth 不滚）。typography 必须覆盖：库默认 h1=displayLarge(57sp) 巨大，已按 web blog.css 收敛为 26/22/19/17sp。
5. **文章详情导航**：正文按块级切分渲染（`splitMarkdownBlocks`），标题块 itemIndex 即锚点；TOC 入口 = 详情页右下角 SmallFloatingActionButton → ModalBottomSheet 列表 → `animateScrollToItem(blockIndex + 1)`（+1 跳过头部 item）。顶部 LinearProgressIndicator 显示阅读进度（firstVisibleItemIndex 占比）。
4. **部署 hanphone-chat**：本机 `ssh blog` 免密（公钥已装）；源码 `~/server_chat/src`，pm2 进程名 `hanphone-chat-server`（跑 dist，改完需 `./node_modules/.bin/tsc` 再 `pm2 restart hanphone-chat-server`）。协议变更先看 `~/server_chat/docs/android-protocol.md`。

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
10. **网页版文库能看、App WebView 白屏**：文件服务（admin-file，hanphone.top）对所有文件响应带 `Content-Disposition: attachment`——WebView 直接 `loadUrl` 会把页面当**下载**，主框架 200 后立刻跳 `about:blank` 白屏（`onPageStarted` 不触发、子资源不加载、无 onReceivedError）。**修复：先 fetch 文件文本再用 `loadDataWithBaseURL(baseUrl=文件目录, html, "text/html","utf-8",null)` 渲染**（网页版 docLoader 也是 fetch 字节渲染，不是直接导航）。文库 .md 预览同理会 fetch 文本。判断「附件下载 vs 页面」看响应头 `content-disposition`。
11. **Toast 原则**：非必要不弹。成功且 UI 已有可见反馈（列表插入新条目、点赞数字变化、头像预览更新）一律不弹；失败、表单校验、登录态提示才弹。聊天 socket 的连接失败走 ReconnectBanner，不发 toast。