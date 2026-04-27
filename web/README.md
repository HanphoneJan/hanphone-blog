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
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React 组件
│   ├── lib/           # 工具函数
│   └── types/         # TypeScript 类型
├── src-tauri/         # Tauri 桌面应用
├── public/            # 静态资源
└── ...
```

---

## 相关文档

- [技术细节](./TECHNICAL_DOCUMENT.md) - 架构设计、配置详解
- [后端文档](../server/README.md) - API 接口说明
- [Workspace 根文档](../README.md) - 项目整体说明、跨模块构建脚本
