# 🖼️ 寒枫的照片墙 | Hanphone's Photo Wall

[![Online Demo](https://img.shields.io/badge/Online%20Demo-Visit-4169E1?style=for-the-badge&logo=chrome)](https://hanphone.cn/atlas/)

> [返回 Workspace 根文档](../../README.md)

## 项目简介

个人照片墙应用，采用新野兽派（Neo-Brutalism）设计语言的便利贴（瀑布流）布局展示精选图片。支持标签分类、互动点赞、智能搜索，部署在 `/atlas/` 路径下。

- **🖼️ 个人照片墙**：打造专属的视觉空间
- **👥 好友共创**：通过用户系统邀请朋友分享精彩瞬间
- **🎨 双布局设计**：便利贴风格 + 瀑布流风格自由切换
- **🏷️ 标签管理**：灵活的多标签分类
- **❤️ 轻量互动**：点赞收藏、访问统计
- **📱 PWA 离线体验**

### 界面预览

| 便利贴布局 | 瀑布流布局 |
|------------|------------|
| ![便利贴布局](../../img/atlas_index_1.png) | ![瀑布流布局](../../img/atlas_index_2.png) |

| 登录页面 |
|----------|
| ![登录页面](../../img/atlas_login.png) |

## 认证与数据

- **认证**：统一使用 [server](../../server/) 的 Spring Boot 后端（`/api/login`）
- **后端服务**：照片墙专属 API 由 [photo-wall-server](../../photo-wall-server/) 提供（Express.js，端口 4001）
- **文件存储**：通过 [admin-file](../../admin-file/) 服务上传/管理图片

## 技术栈

- Vue 3.5 + Composition API + TypeScript
- Vite 6.0
- Element Plus 2.9
- Pinia 2.3
- PWA (vite-plugin-pwa)

## 快速开始

本项目已纳入根目录的 pnpm workspace：

```bash
# 根目录安装所有依赖
pnpm install

# 开发模式
pnpm --filter atlas dev

# 生产构建（产物自动输出到 web/public/atlas/）
pnpm build:photo-wall
```

或在 `apps/photo-wall` 目录内独立操作：

```bash
cd apps/photo-wall
pnpm install
pnpm dev        # 开发
pnpm build      # 构建
```

## 项目结构

```
apps/photo-wall/
├── docs/                          # 项目文档
│   ├── API.md                     # API 接口文档
│   ├── BACKEND.md                 # 后端对接文档
│   └── FRONTEND.md                # 前端开发文档
├── public/                        # 静态资源
│   ├── icons/
│   │   └── icon_zh_48.png         # PWA 图标
│   └── index.html                 # HTML 模板
├── src/                           # 源码目录
│   ├── api/                       # API 接口配置
│   │   ├── api.ts                 # 接口地址定义
│   │   └── interceptor.ts         # 请求拦截器（Bearer Token）
│   ├── assets/                    # 静态资源
│   │   ├── bg_1.jpg               # 背景图 1
│   │   ├── bg_3.webp              # 背景图 3
│   │   ├── heart.svg              # 空心点赞图标
│   │   └── redheart.svg           # 实心点赞图标
│   ├── components/                # Vue 组件
│   │   ├── Atlas.vue              # 照片墙主组件
│   │   ├── NotFound.vue           # 404 页面
│   │   ├── admin/                 # 后台管理组件
│   │   │   ├── AdminAtlas.vue     # 照片管理
│   │   │   ├── AdminTag.vue       # 标签管理
│   │   │   └── AdminUser.vue      # 用户管理
│   │   ├── layout/                # 布局组件
│   │   │   └── NavBar.vue         # 导航栏
│   │   └── login/                 # 登录相关组件
│   │       ├── ForgotPassword.vue # 忘记密码
│   │       └── Login.vue          # 登录弹窗
│   ├── router/                    # 路由配置
│   │   └── router.ts              # Vue Router 配置
│   ├── store/                     # Pinia 状态管理
│   │   └── store.ts               # 全局状态
│   ├── styles/                    # 全局样式
│   │   └── global.css             # 全局 CSS
│   ├── utils/                     # 工具函数
│   │   └── langList.ts            # 语言列表
│   ├── views/                     # 页面视图
│   │   ├── AdminHome.vue          # 管理后台页
│   │   └── Home.vue               # 首页
│   ├── App.vue                    # 根组件
│   ├── main.ts                    # 入口文件
│   ├── auto-imports.d.ts          # auto-import 类型声明
│   ├── components.d.ts            # 组件自动导入声明
│   └── vite.d.ts                  # Vite 类型声明
├── src-android/                   # Android 客户端源码
│   ├── app/                       # App 模块
│   │   ├── build.gradle.kts       # App 构建配置
│   │   ├── proguard-rules.pro     # ProGuard 规则
│   │   └── src/                   # 源码
│   │       ├── androidTest/       # 安卓测试
│   │       ├── main/              # 主源码
│   │       └── test/              # 单元测试
│   ├── gradle/
│   │   └── wrapper/
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── build.gradle.kts           # 项目构建配置
│   ├── gradle.properties          # Gradle 属性
│   ├── gradlew                    # Gradle Wrapper (Unix)
│   ├── gradlew.bat                # Gradle Wrapper (Windows)
│   ├── libs.versions.toml         # 依赖版本管理
│   ├── settings.gradle.kts        # Gradle 设置
│   └── 项目文档.md                 # Android 项目文档
├── env.example                    # 环境变量模板
├── package.json                   # 包配置
├── tsconfig.app.json              # TypeScript App 配置
├── tsconfig.json                  # TypeScript 主配置
├── tsconfig.node.json             # TypeScript Node 配置
├── vite.config.ts                 # Vite 配置（base: "/atlas/"）
└── .gitignore                     # Git 忽略规则
```

## 部署说明

生产构建产物输出到 `web/public/atlas/`，与 Next.js 主站一起部署：

```bash
# 根目录一键构建
pnpm build:photo-wall
# 产物位于 web/public/atlas/，由 Next.js 站点统一托管
```

## 相关文档

- [Workspace 根文档](../../README.md)
- [前端主站文档](../../web/README.md)
- [照片墙后端文档](../../photo-wall-server/README.md)
- [文件服务文档](../../admin-file/README.md)
