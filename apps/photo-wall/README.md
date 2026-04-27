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
- PWA (Serwist/Workbox)

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
├── src/
│   ├── api/               # API 接口配置
│   │   ├── api.ts         # 接口地址定义（BLOG_BASE_URL + API_BASE_URL）
│   │   └── interceptor.ts # 请求拦截器（Bearer Token）
│   ├── assets/            # 静态资源
│   ├── components/        # Vue 组件
│   │   ├── Atlas.vue      # 照片墙主组件
│   │   ├── admin/         # 后台管理组件
│   │   └── layout/        # 布局组件
│   ├── router/            # 路由配置
│   ├── store/             # Pinia 状态管理
│   ├── styles/            # 全局样式
│   ├── utils/             # 工具函数
│   ├── views/             # 页面视图
│   │   ├── Home.vue       # 首页
│   │   └── AdminHome.vue  # 管理后台
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── public/                # 静态资源
└── vite.config.ts         # Vite 配置（base: "/atlas/"）
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
