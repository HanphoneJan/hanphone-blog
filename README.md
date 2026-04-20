# 🌟 Hanphone's Blog

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.4.x-brightgreen.svg)](server/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black.svg)](web/)
[![CI](https://github.com/HanphoneJan/hanphone-blog/actions/workflows/ci.yml/badge.svg)](https://github.com/HanphoneJan/hanphone-blog/actions)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

个人博客系统，采用前后端分离架构：Next.js + Spring Boot。

[在线演示](https://hanphone.cn) · [快速开始](#快速开始) · [文档索引](#文档) · [测试指南](#测试)

---

## 技术栈

- **前端**: Next.js 15 + React 18 + TypeScript + Tailwind CSS + Tauri
- **后端**: Spring Boot 2.4 + JPA + PostgreSQL + Redis

---

## 快速开始

### 环境要求

- Node.js >= 18, Java JDK >= 1.8, Maven >= 3.6
- PostgreSQL >= 12, Redis >= 5.0

### 启动后端

```bash
cd server/
cp env.example .env
# 编辑 .env 配置数据库
mvn spring-boot:run
```

后端运行在 http://localhost:8090

### 启动前端

```bash
cd web/
pnpm install
cp env.example .env
pnpm dev
```

前端运行在 http://localhost:3000

---

## 测试

本项目包含完整的测试套件，支持单元测试和 E2E 测试。

### 运行测试

```bash
# 后端单元测试
cd server && mvn test

# 前端单元测试
cd web && pnpm test

# 前端单元测试（监视模式）
cd web && pnpm test:watch

# 前端 E2E 测试
cd web && pnpm test:e2e
```

### CI 状态

每次推送或 PR 到 `main` 分支时，GitHub Actions 会自动运行：
- ✅ Server 单元测试 (Maven)
- ✅ Web 单元测试 (Vitest)
- ✅ Web E2E 测试 (Playwright)
- ✅ 构建验证

详见 [TESTING.md](TESTING.md) 获取完整的测试文档。

---

## 文档

| 文档 | 说明 |
|------|------|
| [前端开发指南](web/README.md) | 前端配置、命令、部署 |
| [前端技术文档](web/TECHNICAL_DOCUMENT.md) | 前端架构、路由、状态管理 |
| [后端开发指南](server/README.md) | 后端配置、启动、API |
| [后端技术文档](server/TECHNICAL_DOCUMENT.md) | 后端架构、分层设计、安全 |
| [测试指南](TESTING.md) | 单元测试、E2E 测试、CI 配置 |
| [Docker 部署](server/DOCKER_DEPLOYMENT.md) | 生产环境 Docker 部署 |
| [API 文档使用](server/SWAGGER_USAGE.md) | Swagger 注解说明 |
| [Agent 的设计](web/public/docs/Agent的设计.md) | 智能体原理与开发框架 |

---

## 项目结构

```
hanphone-blog/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI 配置
├── server/                 # 后端 (Spring Boot)
│   └── src/test/           # 单元测试
├── web/                    # 前端 (Next.js)
│   ├── e2e/                # E2E 测试
│   └── src/test/           # 单元测试
├── TESTING.md              # 测试文档
└── README.md               # 本文件
```

---

## 鸣谢

本项目 live2d 看板娘实现参考以下开源项目与资源：

- **live2d-widget** — 看板娘核心代码参考自 [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget)
- **迷迷模型** — 来自 bilibili [夜半钟声m](https://space.bilibili.com/) up 主团队：[【免费桌宠/VTS挂件】迷迷](https://www.bilibili.com/video/BV1xrwBejEKd/?share_source=copy_web)
- **airu 模型** — 来自 bilibili [Yuri幽里_official](https://space.bilibili.com/) up 主：[【免费L2D模型】可盐可甜的机能风少女！无料模型大公开~点击领取](https://www.bilibili.com/video/BV1S8411H7zf/?share_source=copy_web)

---

## Star History

<a href="https://www.star-history.com/?repos=HanphoneJan%2Fhanphone-blog&type=date&legend=top-left">
 <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=HanphoneJan/hanphone-blog&type=date&theme=dark&legend=top-left" />
  <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=HanphoneJan/hanphone-blog&type=date&legend=top-left" />
  <img alt="Star History Chart" src="https://api.star-history.com/image?repos=HanphoneJan/hanphone-blog&type=date&legend=top-left" />
 </picture>
</a>

