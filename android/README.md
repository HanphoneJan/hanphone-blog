# android · 云林有风（Android 原生客户端）

博客的 **Kotlin + Jetpack Compose** 原生客户端，直接对接现有后端 REST API（`https://hanphone.cn/api/`），后端零改动。
架构细节、接口坑与踩坑记录见 **[HANDOVER.md](HANDOVER.md)**（接手必读）。

## 技术栈

| 层 | 选型 |
|---|---|
| 语言/UI | Kotlin 2.4.21 + Jetpack Compose (Material 3, BOM 2026.09.00) |
| 网络 | Retrofit 2 + OkHttp + Moshi（含 Date 兼容适配器） |
| 图片 / 播放 | Coil 2 · Media3 ExoPlayer + MediaSession（音乐库后台播放） |
| 导航 | Navigation Compose |
| 后台编辑 | richeditor-compose（Markdown 富文本）+ Vico 3（图表） |
| 构建 | Gradle 9.6.0 + AGP 9.5.1、JDK 21、compileSdk 37 |
| 最低系统 | Android 8.0（API 26） |

## 目录结构

```
app/src/main/java/com/hanphone/blog/
├── MainActivity.kt / BlogApplication.kt
├── core/        登录态（TokenStore）、DataStore 设置、AuthBridge / WebViewFixes、深链
├── data/        api（BlogApi / AdminApi / AdminFileApi）· model · repo · cache · chat · push · update
├── playback/    音乐后台播放（前台服务 + MediaSession、队列 URI 解析、播放通知渠道）
└── ui/          App / AppNav + 页面：
    home / essay / detail / search / message / friendlinks / projects / docs
    hot（热点·榜单·对比）/ music（原生播放器）/ profile / settings / notification / bookmark
    login（登录·注册·忘记密码）/ legal（隐私政策·服务条款）/ webview（通用 WebView）
    admin（概览·内容·评论·分类·友链·文件·个人中心·用户·聚合数据）
```

## 功能概览

- **4 Tab**：首页 / 随笔 / 消息 / 我的；子页：文章与随笔详情、搜索（类型筛选）、留言板、友链（含申请）、通知、收藏、文库、项目、热点、音乐库、照片墙。
- **账号**：用户名密码（md5）、注册、GitHub / Google 登录、忘记密码、长期登录（refresh 轮换）、登录设备管理与下线。
- **内容互动**：文章评论（登录后，点内容即回复）、随笔朋友圈 + 评论、点赞、收藏、站内通知、相关推荐。
- **消息**：原生 Socket.IO（聊天室 + 私信 + AI 流式），FCM 推送兜底。
- **音乐库**：原生播放器（歌单/歌词/进度气泡/缓冲段/倍速 0.5×–2.0×/循环模式），**支持后台播放**：离开页面/息屏/锁屏/划掉任务继续播，通知栏与锁屏可控制（封面/上一首/播放暂停/下一首/进度），蓝牙与线控按键、音频焦点、拔耳机暂停。
- **后台**（仅管理员）：「我的 → 管理」：站点概览、访客明细、随笔/博客/评论/标签/分类/友链/项目/文库、文件管理、个人中心（资料/技能/作品/评价/MCP 密钥）、用户管理、聚合数据。
- **设置**：外观（双主题/自定义背景）、数据管理、登录设备、检查更新、隐私政策/服务条款（原生页面）、关于；退出登录在设置页底部。

## 构建 / 安装

```bash
cd android
./gradlew :app:assembleDebug            # debug APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

./gradlew :app:testDebugUnitTest        # JVM 单测
./gradlew :app:assembleRelease          # release（当前用 debug 密钥签名）
```

> 本机依赖仓库与 Gradle 发行版一般可直连；若发行版下载 307 到 `github.com` 失败，再给本次构建注入
> `127.0.0.1:10808` 代理（`GRADLE_OPTS` 里配 http/https proxy，代理没启动时反而会让解析失败）。

## 对接说明

- 接口前缀 `/api` 由 nginx 剥离，App 直接请求 `https://hanphone.cn/api/...`，与 web 一致；Token 由 OkHttp 拦截器注入。
- 文件服务（上传/视频）在 `https://hanphone.top/`，后台上传单独走 `AdminFileApi`（手动带 Token）。
- 正文为 Markdown，渲染基于 `multiplatform-markdown-renderer`（`ui/Markdown.kt` 薄封装）。
- API 基地址在 `app/build.gradle.kts` 的 `buildConfigField("API_BASE_URL")`，局域网联调可改成本机地址。

## 版本

当前 `versionName 1.3.4` / `versionCode 28`（上次正式发布）。其后功能已完成但**未发版**；
版本号与新 Release 等用户明确指定后再升，不要自行递增。
