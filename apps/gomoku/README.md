# 五子棋 (Gomoku)

基于 Uni-app + Vue 3 开发的五子棋小游戏，支持人机对战和本地双人同屏对战。

## 功能特性

- **人机对战** — 内置 AI 对手，支持不同难度
- **本地对战** — 双人同屏竞技
- **棋盘大小切换** — 支持多种棋盘尺寸
- **计时与统计** — 对局时间、步数、分数实时显示
- **响应式布局** — 适配手机端和桌面端

## 技术栈

- [Uni-app](https://uniapp.dcloud.net.cn/) 3.x
- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/) 5.x

## 快速开始

本项目已纳入根目录的 pnpm workspace，推荐在根目录统一管理：

```bash
# 根目录安装所有依赖
pnpm install

# H5 开发模式
pnpm --filter uni-preset-vue dev:h5

# H5 构建（自动输出到 web/public/games/gomoku/）
pnpm build:gomoku
```

或在 `apps/gomoku` 目录内独立操作：

```bash
cd apps/gomoku
pnpm install
pnpm dev:h5        # H5 开发
pnpm build:h5      # H5 构建
```

构建产物会自动复制到 `web/public/games/gomoku/`，作为前端站点的静态资源部署。

## 项目结构

```
apps/gomoku/
├── src/
│   ├── pages/
│   │   ├── index/          # 首页（模式选择）
│   │   ├── gomoku/         # 本地对战页面
│   │   └── aigomoku/       # 人机对战页面
│   ├── App.vue             # 应用入口
│   ├── main.js             # 主脚本
│   ├── manifest.json       # 应用配置
│   ├── pages.json          # 页面路由配置
│   └── static/             # 静态资源
├── package.json
└── vite.config.js
```

## 构建脚本说明

```bash
# H5 开发
pnpm dev:h5

# H5 生产构建（同时复制产物到 web/public/games/gomoku/）
pnpm build:h5
```

根目录 `package.json` 中已配置快捷命令：

```bash
pnpm build:gomoku    # 等同于 pnpm --filter uni-preset-vue build:h5
```

## 相关文档

- [Workspace 根文档](../../README.md)
- [前端主站文档](../../web/README.md)
