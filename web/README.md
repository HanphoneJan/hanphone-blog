# Hanphone's Blog - 前端

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

基于 Next.js 15 + Tauri 的博客前端。

---

## 快速开始

本项目作为 **pnpm workspace** 的一部分。推荐在根目录下执行初始化。

```bash
# 在根目录安装
pnpm install

# 在 web 目录下或使用过滤
cp env.example .env
pnpm dev
```

访问 http://localhost:3000

---

## 环境变量

复制 `env.example` 为 `.env`：

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8090` |
| `NEXT_PUBLIC_FILE_DOMAIN` | 文件服务域名 | `hanphone.top` |
| `NEXT_PUBLIC_SITE_URL` | 站点主域名 | `https://hanphone.cn` |

---

## 常用命令

在根目录下通过 `pnpm --filter web` 执行，或直接在 `web/` 目录内执行：

```bash
# 根目录执行
pnpm --filter web dev              # 开发服务器
pnpm --filter web build            # 生产构建
pnpm --filter web dev:tauri        # Tauri 开发模式
pnpm --filter web tauri:build      # 构建桌面应用
pnpm --filter web build:static     # 静态导出

# 或进入 web 目录
cd web
pnpm dev
pnpm build
```

---

## 部署

### Node.js 部署

```bash
# 根目录
pnpm --filter web build
pnpm --filter web start

# 或进入 web 目录
cd web
pnpm build
pnpm start
```

### 静态导出 (GitHub Pages)

```bash
pnpm --filter web build:static
```

### Docker 部署

前端通常部署到 Vercel/Netlify，或使用 Nginx 托管静态文件。

---

## 主题预览

| 亮色主题 | 暗色主题 |
|----------|----------|
| ![亮色主题](../img/home_light_1.png) | ![暗色主题](../img/home_dark_1.png) |

| 马卡龙主题 | 赛博朋克主题 |
|------------|--------------|
| ![马卡龙主题](../img/home_macaron_1.png) | ![赛博朋克主题](../img/home_cyber_1.png) |

---

## 项目结构

```
web/
├── apps/
│   └── photo-wall/                 # 照片墙子应用 (Uni-app + Vue3)
├── public/                         # 静态资源
│   ├── games/                      # 小游戏合集
│   │   ├── 2048/
│   │   ├── blackblocks/
│   │   ├── breakout-bricks/
│   │   ├── crossy-road/
│   │   ├── minesweeper/
│   │   ├── ping-pong/
│   │   ├── shudu/
│   │   ├── snake/
│   │   ├── tetris/
│   │   ├── tower-blocks/
│   │   └── toy-claw/
│   ├── play/                       # 趣味小工具/页面
│   │   ├── canvas-particle-universe/
│   │   ├── congratulation/
│   │   ├── happy-birthday/
│   │   ├── letter/
│   │   ├── lottery/
│   │   ├── love-chiikawa/
│   │   ├── love-guess-moss/
│   │   ├── love-memory/
│   │   ├── read/
│   │   ├── resume/
│   │   ├── simple-piano/
│   │   ├── todo/
│   │   ├── torus-knot-geometry/
│   │   └── visual-player/
│   ├── tools/                      # 实用工具
│   │   ├── browser-extension-intercept/
│   │   ├── buy-tencent-ecs/
│   │   ├── calculator/
│   │   ├── markdown-converter/
│   │   ├── photo-compressor/
│   │   └── rgb-color-picker/
│   ├── live2d/                     # Live2D 模型资源
│   │   └── models/
│   ├── shared/                     # 共享静态资源
│   │   └── font-awesome-4.7.0/
│   ├── avatar.png
│   ├── background.webp
│   ├── icon.png
│   └── og-image.png
├── scripts/                        # 构建脚本
│   ├── build-static.mjs
│   ├── build-tauri.mjs
│   └── verify-pwa.cjs
├── src/                            # 源码目录
│   ├── app/                        # Next.js App Router
│   │   ├── (main)/                 # 前台路由组
│   │   │   ├── about/              # 关于页面
│   │   │   ├── blog/               # 博客列表/详情
│   │   │   ├── components/         # 主页公共组件
│   │   │   ├── docs/               # 文档中心
│   │   │   ├── essays/             # 随笔
│   │   │   ├── hooks/              # 主页自定义 Hooks
│   │   │   ├── links/              # 友链页面
│   │   │   ├── messages/           # 留言板
│   │   │   ├── projects/           # 项目展示
│   │   │   ├── privacy/            # 隐私政策
│   │   │   ├── rss/                # RSS 订阅
│   │   │   ├── terms/              # 使用条款
│   │   │   ├── error/              # 错误页面
│   │   │   ├── HomeClient.tsx
│   │   │   ├── home.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── admin/                  # 后台管理路由组
│   │   │   ├── blog-files/         # 博客文件管理
│   │   │   ├── blog-input/         # 博客发布/编辑
│   │   │   ├── blogs/              # 博客管理
│   │   │   ├── comments/           # 评论管理
│   │   │   ├── docs/               # 文档管理
│   │   │   ├── essays/             # 随笔管理
│   │   │   ├── links/              # 友链管理
│   │   │   ├── personal/           # 个人资料
│   │   │   ├── projects/           # 项目管理
│   │   │   ├── tags/               # 标签管理
│   │   │   ├── types/              # 类型定义
│   │   │   ├── users/              # 用户管理
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/                    # API 路由
│   │   ├── next-api/               # Next.js API
│   │   ├── oauth/                  # OAuth 回调
│   │   ├── offline/                # PWA 离线页面
│   │   ├── globals.css             # 全局样式
│   │   ├── layout.tsx              # 根布局
│   │   ├── manifest.ts             # PWA Manifest
│   │   ├── robots.ts               # 爬虫规则
│   │   ├── sitemap.ts              # 站点地图
│   │   └── sw.ts                   # Service Worker
│   ├── components/                 # React 公共组件
│   │   ├── __tests__/              # 组件测试
│   │   ├── charts/                 # 图表组件
│   │   │   ├── BlogChart.tsx
│   │   │   ├── TagChart.tsx
│   │   │   ├── TypeChart.tsx
│   │   │   └── VisitorMap.tsx
│   │   ├── shared/                 # 共享基础组件
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── LoadingBar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ModalOverlay.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── index.ts
│   │   ├── AdminHeader.tsx
│   │   ├── BackgroundImage.tsx
│   │   ├── BackgroundSettings.tsx
│   │   ├── FloatingChat.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── JsonLd.tsx
│   │   ├── Live2DWidget.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── UserInfoForm.tsx
│   ├── contexts/                   # React Context
│   │   ├── ThemeProvider.tsx
│   │   └── UserContext.tsx
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── index.ts
│   │   ├── useCachedData.ts
│   │   ├── useDebounce.ts
│   │   ├── useGoogleAuth.ts
│   │   ├── useImageUpload.ts
│   │   ├── useInfiniteScroll.ts
│   │   ├── useInlineEdit.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePagination.ts
│   │   └── usePersonalProfile.ts
│   ├── lib/                        # 工具库
│   │   ├── __tests__/              # 工具测试
│   │   ├── live2d/                 # Live2D 相关
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   ├── icons.tsx
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── message.ts
│   │   │   └── utils.ts
│   │   ├── api.ts
│   │   ├── constants.ts
│   │   ├── labels.ts
│   │   ├── location.ts
│   │   ├── personal-profile.ts
│   │   ├── seo-config.ts
│   │   ├── slugify.ts
│   │   └── utils.ts
│   ├── types/                      # TypeScript 类型定义
│   │   └── response.ts
│   ├── assets/                     # 静态数据资源
│   │   └── china.json
│   ├── test/                       # 测试配置
│   │   └── setup.ts
│   └── global.d.ts
├── src-tauri/                      # Tauri 桌面应用
│   ├── src/                        # Rust 源码
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── icons/                      # 应用图标
│   ├── gen/                        # 生成代码
│   │   ├── android/
│   │   └── schemas/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── middleware.ts                   # Next.js 中间件
├── next.config.ts                  # Next.js 配置
├── tailwind.config.ts              # Tailwind CSS 配置
├── vitest.config.ts                # Vitest 测试配置
├── tsconfig.json                   # TypeScript 配置
├── postcss.config.mjs              # PostCSS 配置
├── eslint.config.mjs               # ESLint 配置
└── package.json                    # 项目配置
```

---

## 相关文档

- [技术细节](./TECHNICAL_DOCUMENT.md) - 架构设计、配置详解
- [后端文档](../server/README.md) - API 接口说明
- [Workspace 根文档](../README.md) - 项目整体说明、跨模块构建脚本
