# android · 云林有风（Android 原生客户端）

博客的 **Kotlin + Jetpack Compose** 原生客户端，直接对接现有后端 REST API（`https://hanphone.cn/api/`），后端零改动。

## 技术栈

| 层 | 选型 |
|---|---|
| 语言/UI | Kotlin 2.0 + Jetpack Compose (Material 3) |
| 网络 | Retrofit 2 + OkHttp + Gson（含 Date 兼容解析） |
| 图片 | Coil |
| 导航 | Navigation Compose |
| 构建 | Gradle 8.11.1 + AGP 8.7.3（Gradle Wrapper 已内置） |
| 最低系统 | Android 8.0（API 26） |

## 目录结构

```
app/src/main/java/com/hanphone/blog/
├── MainActivity.kt              # 入口
├── core/Settings.kt             # DataStore：主题模式 + 访客昵称/邮箱
├── data/
│   ├── model/Models.kt          # 全部 API 数据模型
│   ├── api/BlogApi.kt           # Retrofit 接口（30+ 端点）
│   ├── api/ApiClient.kt         # Retrofit/Gson/OkHttp + X-Request-Id
│   └── repo/Repos.kt            # Blog / Essay / Message 三个仓库
└── ui/
    ├── App.kt                   # 根：主题 + 底部导航 5 Tab + 路由
    ├── home/HomeScreen.kt       # 信息流（分类筛选/下拉刷新/无限滚动）
    ├── detail/ArticleDetail.kt  # 文章详情 + 评论区 + 点赞/评论/分享
    ├── essay/EssaysScreen.kt    # 随笔列表 + 详情
    ├── search/SearchScreen.kt   # 全局搜索（博客/随笔/文档/项目）
    ├── archive/ArchiveScreen.kt # 按年归档
    ├── message/MessageScreen.kt # 留言板（快速留言）
    ├── profile/ProfileScreen.kt # 我的：站点统计/项目/主题/友链/关于
    ├── projects/               # 项目页（类型筛选 + 分组卡片，对标 web /projects）
    ├── docs/                   # 文库（文件夹树/搜索/类型筛选，对标 web /docs；MD 预览）
    ├── webview/                # 通用 WebView（项目链接 / 文库 HTML 文档，App 内打开）
    ├── components/              # ArticleCard、Avatar、Loading/Error/Empty
    ├── Markdown.kt              # 极简 Markdown 渲染器
    └── theme/                   # Material 3 浅/深色主题
```

## 功能（v1.0.0）

- **底部导航 4 Tab**：首页 / 随笔 / 消息 / 我的
- **首页**：分类标签筛选 + 排序/标签筛选面板 + 下拉刷新 + 无限滚动 + 搜索入口
- **详情页**：Markdown 正文（代码高亮/表格）、评论列表、匿名评论（`X-Request-Id` 幂等）、点赞
- **随笔**：朋友圈式信息流（头像/昵称/九宫格/赞评）+ 冷启动缓存秒显 + Paging 3
- **搜索**：全局搜索（博客/随笔/文档/项目）
- **消息 Hub**：聊天室（socket.io，AI@寒枫 流式）+ 私信（管理员分流、本地通知），历史/用户列表本地缓存，首进秒显
- **我的**：站点统计、项目、文库、友链、留言板入口、关于（链接 hanphone.cn/GitHub）
- **项目**（我的 → 项目）：类型筛选 + 分组卡片，点击 WebView 内打开链接
- **文库**（我的 → 文库）：文件夹树 + 搜索/类型筛选；HTML → WebView（fetch+loadDataWithBaseURL）、MD → 应用内预览、PDF/DOCX → 系统打开
- **设置**：账号（头像上传/退出/编辑邮箱·密码）、外观（双主题/自定义背景）、**数据管理**（分项清除缓存 + Coil 图片缓存 + 全部清除确认）
- 双主题（白日/黑夜）、图标与 PWA maskable 一致

## 构建 / 安装

```bash
# 首次构建（自动下载 Gradle 发行版与依赖，约几分钟）
cd android
./gradlew :app:assembleDebug

# 产物路径
#   app/build/outputs/apk/debug/app-debug.apk

# 真机安装（USB 调试）
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️ **本机（hanphone 开发机）构建代理注意**：Gradle 发行版下载会 307 重定向到
> `github.com`（当前网络直连不通），而依赖仓库（Maven Central / Google / plugin portal）可直连。
> 因此只需给下载这一步注入本地代理（`127.0.0.1:10808`），构建成功后发行版会被缓存到 `~/.gradle`：
>
> ```bash
> export GRADLE_OPTS="-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=10808 \
>   -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=10808 \
>   -Dhttp.nonProxyHosts=localhost|127.0.0.1 -Dhttps.nonProxyHosts=localhost|127.0.0.1"
> ./gradlew :app:assembleDebug
> ```
>
> 该代理为本机环境变量（HTTP_PROXY/HTTPS_PROXY），未写入仓库任何配置文件，不影响 CI 与其他机器。

## 命令行构建依赖

- JDK 17+（本项目在 JDK 21 上验证）
- Android SDK：`platforms;android-35`、`build-tools;35.0.0`、`platform-tools`
- SDK 路径写入 `local.properties` 的 `sdk.dir`（或用环境变量 `ANDROID_HOME`）

## 对接说明

- 接口前缀 `/api` 由 nginx 剥离，App 直接请求 `https://hanphone.cn/api/...`，与 web 端一致。
- 图片（封面/正文/头像）如为相对路径会拼上文件服务域名 `https://hanphone.top`。
- 文章正文为 **Markdown**，`app/src/main/java/com/hanphone/blog/ui/Markdown.kt` 提供 v1 精简渲染；
  后续可替换为成熟库（`com.mikepenz:multiplatform-markdown-renderer`）。
- API 基地址定义在 `app/build.gradle.kts` 的 `buildConfigField("API_BASE_URL")`，
  局域网真机联调可改为 `http://<电脑IP>:8090/api/`（并需在 debug 清单开启明文流量）。

## Roadmap

- [ ] 登录/注册（JWT 存 DataStore）+ 点赞、随笔评论
- [ ] 4 套主题（web 端 light/dark/macaron/cyberpunk 转 Compose token）
- [ ] 图片上传（admin-file，拍照/相册权限）
- [ ] 归档年份吸顶（stickyHeader 实验 API）
- [ ] release 签名 + R8 混淆