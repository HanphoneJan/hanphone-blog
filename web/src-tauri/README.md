# Tauri 桌面/移动应用

本项目使用 [Tauri 2](https://tauri.app/) 将 Next.js 博客打包为桌面端（Windows/Linux）和移动端（Android）应用。

## 技术栈

- **Tauri 2.11.2** — Rust 编写的跨平台应用框架
- **Next.js 15** — 前端框架（静态导出模式）
- **Rust 2024 Edition** — Tauri 后端逻辑
- **tauri-plugin-opener** — 系统默认应用打开外部链接

## 目录结构

```
src-tauri/
├── Cargo.toml              # Rust 项目配置
├── Cargo.lock              # 依赖锁定
├── build.rs                # Tauri 构建脚本
├── tauri.conf.json         # Tauri 核心配置
├── README.md               # 本文档
├── src/
│   ├── lib.rs              # 应用入口（含移动端入口点）
│   └── main.rs             # 桌面端入口
├── icons/                  # 应用图标（多尺寸 PNG + ICO）
├── gen/
│   └── android/            # Android 项目（Gradle + Kotlin）
│       ├── app/
│       │   ├── build.gradle.kts
│       │   └── src/main/   # Kotlin 源码、资源、AndroidManifest
│       ├── buildSrc/       # Gradle 构建任务（BuildTask.kt）
│       ├── build.gradle.kts
│       ├── gradle.properties
│       ├── settings.gradle
│       └── hanphone-blog.keystore   # Release 签名密钥库
└── target/                 # Rust 编译输出（自动创建）
```

## 核心配置

### tauri.conf.json

| 字段 | 值 | 说明 |
|------|-----|------|
| `productName` | `hanphone` | 应用名称 |
| `identifier` | `cn.hanphone.blog` | 包名（Android 使用） |
| `build.frontendDist` | `../dist` | Next.js 静态导出目录 |
| `build.beforeBuildCommand` | `pnpm build:tauri` | 构建前执行脚本 |
| `bundle.targets` | `msi, nsis, deb, rpm, appimage, app` | 桌面安装包格式 |
| `bundle.windows.webviewInstallMode` | `embedBootstrapper` | 内嵌 WebView2 安装器 |

### Rust 入口 (src/lib.rs)

- 使用 `tauri::mobile_entry_point` 支持移动端
- 加载 `tauri_plugin_opener` 插件（用于打开外部浏览器链接）
- **开发模式自动打开 DevTools**：仅在 `debug_assertions` 下生效

## 构建流程

### 前置条件

1. 安装 Rust（>= 1.85）和 cargo
2. 安装 Node.js / pnpm
3. 安装 Tauri CLI：`cargo install tauri-cli` 或通过 pnpm 使用 `@tauri-apps/cli`

### 桌面端构建

```bash
# 从 web/ 目录执行
cd web

# 开发模式（热重载）
pnpm tauri dev

# Release 构建（生成安装包）
pnpm tauri build
```

Release 输出目录：`web/src-tauri/target/release/bundle/`

- Windows: `.msi`（安装包）、`.exe`（NSIS 安装器）
- Linux: `.deb`、`.rpm`、`.AppImage`

### Android 构建

#### 环境准备

1. **安装 Android Studio** + Android SDK
2. **安装 NDK 25.2.9519653**（Tauri 2 要求，NDK 30 不兼容）
   ```bash
   # 通过 sdkmanager 安装
   sdkmanager "ndk;25.2.9519653"
   ```
3. **安装 cmdline-tools**
4. **设置环境变量**（Windows 示例）：
   ```powershell
   $env:ANDROID_HOME = "D:/Android/SDK"
   ```
5. **Windows 开启开发者模式**（用于创建符号链接）

#### 初始化 Android 项目

```bash
# 仅首次需要
pnpm tauri android init
```

这会生成 `gen/android/` 目录下的完整 Gradle 项目。

#### 构建 APK

```bash
# Debug 版本（可直接安装调试）
pnpm tauri android dev

# Release 版本（已签名）
pnpm tauri android build
```

Release 输出：
- APK: `gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`
- AAB: `gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`

#### Release 签名配置

`pnpm tauri android init` 生成的 `gen/android/` 目录中包含签名配置，需在以下生成文件中设置：

- `gradle.properties`：配置 `RELEASE_STORE_FILE`、`RELEASE_STORE_PASSWORD`、`RELEASE_KEY_ALIAS`、`RELEASE_KEY_PASSWORD`
- `app/build.gradle.kts`：配置 `signingConfigs.create("release")` + `buildTypes.release.signingConfig`

当前密钥库：`gen/android/hanphone-blog.keystore`
- 别名：`hanphone`
- 密码：`hanphone123`

## 关键技术细节

### 1. Next.js 静态导出兼容

本项目使用 Next.js App Router，包含大量 SSR 特性（`force-dynamic`、API Routes、`headers()`、Server Actions），与 Tauri 要求的 `output: 'export'` 模式冲突。

**解决方案**：使用 [build-tauri.mjs](../scripts/build-tauri.mjs) 脚本在构建前临时修改源码：

1. 将 `export const dynamic = 'force-dynamic'` 替换为 `'force-static'`
2. 移除 `cache: 'no-store'` 和 `revalidate` 配置
3. 重写 `src/lib/location.ts`（避免服务端获取地理位置）
4. 重写 `src/app/next-api/metadata/route.tsx`（避免服务端读取数据）
5. 为动态路由添加 `generateStaticParams()`
6. 临时移除 `api/docs/route.ts`（避免与 `api/docs/[id]` 的静态导出文件名冲突）

**关键特性**：所有修改在 `finally` 块中自动恢复，保证源码安全。

### 2. 已修复的问题

#### Gradle BuildTask.kt — 使用 npx 替代 node

`tauri android init` 生成的 `BuildTask.kt` 原始使用 `node` 执行，但 Windows 下无法找到 `tauri` 命令。需改为 `npx` 通过回退机制（`.exe`、`.cmd`、`.bat`）解决。

#### Kotlin Daemon 跨磁盘路径错误

当 Cargo 注册表在 `C:` 盘而项目在 `E:` 盘时，Kotlin 增量编译器报错：

```
this and base files have different roots
```

**解决**：在生成的 `gradle.properties` 中禁用 Kotlin daemon 和增量编译：

```properties
kotlin.compiler.execution.strategy=in-process
kotlin.incremental=false
```

#### Gradle 国内镜像

首次构建时可能因无法连接 `dl.google.com` 失败。已通过代理或国内镜像解决。

### 3. CORS 配置

后端 Spring Boot 需要允许 Tauri 的 origin：

```java
// WebConfiguration.java
.allowedOriginPatterns("http://localhost:*", "tauri://localhost")
```

- `http://localhost:*` — Tauri 桌面端（使用 HTTP scheme 时）
- `tauri://localhost` — Tauri 默认 scheme

### 4. WebView2 内嵌

Windows 桌面端使用 `embedBootstrapper` 模式，将 WebView2 安装器嵌入安装包，避免首次运行时弹下载页面。

```json
"windows": {
  "webviewInstallMode": {
    "type": "embedBootstrapper"
  }
}
```

## 注意事项

1. **构建时不要修改源码**：`build-tauri.mjs` 会自动 patch 和恢复，手动修改可能导致冲突。
2. **Keystore 安全**：`hanphone-blog.keystore` 包含私钥，**不要提交到 Git**（已在 `.gitignore` 中）。
3. **Android NDK 版本**：必须使用 25.x，30+ 不兼容 Tauri 2。
4. **静态导出限制**：`next.config.js` 中的 `rewrites`、`redirects`、`headers` 在静态导出时不生效，Tauri 应用无法使用这些特性。
5. **开发模式 DevTools**：`lib.rs` 中开发模式自动打开 DevTools，方便调试前端代码。

## 常用命令速查

```bash
# === 开发 ===
pnpm tauri dev              # 桌面端开发
pnpm tauri android dev      # Android 开发（需连接设备/模拟器）

# === 构建 ===
pnpm tauri build            # 桌面端 Release
pnpm tauri android build    # Android Release APK/AAB

# === Gradle ===
cd gen/android && ./gradlew --stop    # 停止 Gradle Daemon
cd gen/android && ./gradlew clean     # 清理构建产物
```

## 相关文档

- [Tauri 官方文档](https://tauri.app/)
- [Next.js 静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android 构建指南](https://tauri.app/distribute/apk-sign/)
