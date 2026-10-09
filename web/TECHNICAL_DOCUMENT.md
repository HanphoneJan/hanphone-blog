# 前端技术文档

> [返回前端文档](./README.md)

---

## 项目结构

```
web/src/
├── app/                        # Next.js App Router
│   ├── (main)/                 # 前台路由组
│   │   ├── page.tsx            # 首页
│   │   ├── layout.tsx          # 前台布局
│   │   ├── about/              # 关于我页面
│   │   ├── blog/               # 博客模块
│   │   │   ├── page.tsx        # 博客列表
│   │   │   └── [id]/           # 博客详情
│   │   ├── docs/               # 文档中心
│   │   │   ├── page.tsx        # 文档列表
│   │   │   └── [id]/           # 文档详情
│   │   ├── essays/             # 随笔页面
│   │   ├── links/              # 友情链接
│   │   ├── messages/           # 留言板
│   │   ├── projects/           # 项目展示
│   │   ├── privacy/            # 隐私政策
│   │   ├── terms/              # 用户协议
│   │   ├── error/              # 错误页面
│   │   ├── components/         # 前台专用组件
│   │   └── hooks/              # 前台专用 Hooks
│   │
│   ├── admin/                  # 管理后台
│   │   ├── page.tsx            # 管理后台首页
│   │   ├── layout.tsx          # 后台布局
│   │   ├── blogs/              # 博客管理
│   │   ├── blog-input/         # 博客编辑/新建
│   │   ├── blog-files/         # 博客文件管理
│   │   ├── essays/             # 随笔管理
│   │   ├── links/              # 友情链接管理
│   │   ├── projects/           # 项目管理
│   │   ├── tags/               # 标签管理
│   │   ├── types/              # 分类管理
│   │   ├── users/              # 用户管理
│   │   ├── comments/           # 评论管理
│   │   └── personal/           # 个人资料管理
│   │
│   ├── api/                    # API 路由 (文档相关)
│   ├── next-api/               # Next.js API 路由 (元数据)
│   ├── offline/                # PWA 离线页面
│   ├── layout.tsx              # 根布局
│   ├── globals.css             # 全局样式
│   ├── sw.ts                   # Service Worker
│   ├── manifest.ts             # PWA Manifest
│   ├── sitemap.ts              # 站点地图
│   └── robots.ts               # 爬虫配置
│
├── components/                 # 全局组件
│   ├── Header.tsx              # 导航头部
│   ├── Footer.tsx              # 页脚
│   ├── LoginForm.tsx           # 登录表单
│   ├── RegisterForm.tsx        # 注册表单
│   ├── UserInfoForm.tsx        # 用户信息表单
│   ├── Live2DWidget.tsx        # Live2D 看板娘
│   ├── JsonLd.tsx              # JSON-LD SEO
│   ├── BackgroundImage.tsx     # 背景图组件
│   ├── BackgroundSettings.tsx  # 背景设置
│   ├── AdminHeader.tsx         # 后台头部
│   ├── charts/                 # 图表组件
│   └── shared/                 # 共享 UI 组件
│
├── contexts/                   # React Context
│   ├── ThemeProvider.tsx       # 主题管理
│   └── UserContext.tsx         # 用户状态管理
│
├── hooks/                      # 自定义 Hooks
│   ├── useCachedData.ts        # 数据缓存
│   ├── useDebounce.ts          # 防抖
│   ├── useImageUpload.ts       # 图片上传
│   ├── useInfiniteScroll.ts    # 无限滚动
│   ├── useInlineEdit.ts        # 行内编辑
│   ├── useLocalStorage.ts      # LocalStorage
│   ├── usePagination.ts        # 分页
│   └── usePersonalProfile.ts   # 个人资料
│
├── lib/                        # 工具库
│   ├── api.ts                  # API 请求封装
│   ├── constants.ts            # 常量定义
│   ├── labels.ts               # 文案标签
│   ├── location.ts             # 地理位置
│   ├── personal-profile.ts     # 个人资料配置
│   ├── seo-config.ts           # SEO 配置
│   ├── slugify.ts              # URL  slug 生成
│   ├── utils.ts                # 通用工具函数
│   └── Alert.tsx               # 全局弹窗
│
├── types/                      # TypeScript 类型
└── assets/                     # 静态资源
```

---

## 路由设计

### 前台路由 (app/(main)/)

| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | page.tsx | 首页 |
| `/about` | about/page.tsx | 关于我 |
| `/blog` | blog/page.tsx | 博客列表 |
| `/blog/[id]` | blog/[id]/page.tsx | 博客详情 |
| `/docs` | docs/page.tsx | 文档列表 |
| `/docs/[id]` | docs/[id]/page.tsx | 文档详情 |
| `/essays` | essays/page.tsx | 随笔 |
| `/links` | links/page.tsx | 友情链接 |
| `/rss` | rss/page.tsx | RSS 订阅 |
| `/messages` | messages/page.tsx | 留言板 |
| `/projects` | projects/page.tsx | 项目展示 |
| `/privacy` | privacy/page.tsx | 隐私政策 |
| `/terms` | terms/page.tsx | 用户协议 |
| `/error` | error/page.tsx | 错误页面 |
| `/insight` | insight/page.tsx | 热点聚合（热点流 / 模型榜单 / 模型对比） |

### 管理后台 (app/admin/)

| 路由 | 文件 | 说明 |
|------|------|------|
| `/admin` | page.tsx | 后台首页/仪表盘 |
| `/admin/blogs` | blogs/page.tsx | 博客列表管理 |
| `/admin/blog-input` | blog-input/page.tsx | 博客编辑/新建 |
| `/admin/blog-files` | blog-files/page.tsx | 博客文件管理 |
| `/admin/docs` | docs/page.tsx | 文档管理 |
| `/admin/essays` | essays/page.tsx | 随笔管理 |
| `/admin/links` | links/page.tsx | 友情链接管理 |
| `/admin/projects` | projects/page.tsx | 项目管理 |
| `/admin/tags` | tags/page.tsx | 标签管理 |
| `/admin/types` | types/page.tsx | 分类管理 |
| `/admin/users` | users/page.tsx | 用户管理 |
| `/admin/comments` | comments/page.tsx | 评论管理 |
| `/admin/personal` | personal/page.tsx | 个人资料设置 |
| `/admin/insight` | insight/page.tsx | 聚合数据（手动采集 / 信源健康 / AI 摘要配置） |

---

## 组件架构

### 全局组件 (components/)

| 组件 | 用途 |
|------|------|
| Header.tsx | 前台导航头部，包含登录状态 |
| Footer.tsx | 页脚 |
| LoginForm.tsx | 登录弹窗表单 |
| RegisterForm.tsx | 注册弹窗表单 |
| UserInfoForm.tsx | 用户信息编辑表单 |
| Live2DWidget.tsx | Live2D 看板娘挂件 |
| JsonLd.tsx | JSON-LD 结构化数据（SEO） |
| BackgroundImage.tsx | 背景图组件 |
| BackgroundSettings.tsx | 背景设置 |
| AdminHeader.tsx | 后台顶部导航 |
| charts/ | ECharts 数据可视化组件 |
| shared/ | 共享 UI 组件（Button, Modal 等） |

### 前台专用组件 (app/(main)/components/)

前台页面特定的组件，如博客卡片、评论列表等。

---

## 状态管理

### ThemeProvider (contexts/ThemeProvider.tsx)

主题切换管理（亮色/暗色模式）。

### UserContext (contexts/UserContext.tsx)

用户登录状态全局管理。

---

## 自定义 Hooks (hooks/)

| Hook | 用途 |
|------|------|
| useCachedData | 带缓存的数据获取 |
| useDebounce | 防抖处理 |
| useImageUpload | 图片上传逻辑 |
| useInfiniteScroll | 无限滚动加载 |
| useInlineEdit | 行内编辑功能 |
| useLocalStorage | LocalStorage 封装 |
| usePagination | 分页逻辑 |
| usePersonalProfile | 个人资料管理 |

---

## API 封装 (lib/api.ts)

统一封装后端 API 调用，包含：
- 请求拦截（添加 Token）
- 响应拦截（错误处理）
- 各模块 API 方法（blogApi, userApi 等）

---

## 热点聚合页 (app/(main)/insight)

集热点流、模型榜单与模型对比于一体，数据来自后端 `/hot/*` 公开接口。

- `page.tsx` 为 **`force-dynamic`** 按请求渲染（数据每日更新，避免构建期预渲染/缓存导致空数据）。服务端取数优先使用 `API_INTERNAL_BASE_URL`（**内网直连后端 8090，无 `/api` 前缀**），未配置时回落到 `NEXT_PUBLIC_API_BASE_URL`。
- 同目录组件：
  - `InsightClient.tsx` — 热点 / 榜单 / 对比 三视图、分区与模态切换、趋势图容器；页脚「数据来源」为**换行 chips**
  - `ComparePanel.tsx` — **结果优先**布局 + 紧凑工具栏；选择器为弹层（**按榜单 / 按公司 / 搜索**，数据来自 `/hot/leaderboards`、`/hot/vendors`、`/hot/models?vendor=&sort=newest|name|price|context`），**默认预置六家代表厂商各自最强**（DeepSeek / Z.ai / Kimi / Anthropic / OpenAI / Google，取自文本榜排序）；能力雷达、价格-能力散点、明细表（只列至少一个模型有分的口径）、**导出图片**（`html-to-image`）与**分享链接**（`?view=compare&models=...`）
  - `LeaderboardTrend.tsx` — 榜单近 30 天分数趋势折线（echarts 按需加载）
- 后端接口：`/hot/models` 支持 `vendor`+`sort`，`/hot/vendors` 返回归一后的厂商（重点厂商置顶）；写死的 `/hot/models/featured` 已移除。
- 后台 `/admin/insight`（导航「聚合数据」）：**异步触发采集**（`POST /admin/hot/collect` + 轮询 `GET /admin/hot/status`）、信源健康、**采集记录（服务端分页 + 筛选 + 排序：触发方式 / 结果 / 明细关键词 / 日期区间 / 时间正倒序 / 每页条数）**、**AI 摘要配置**（URL / Key / Model / 自定义 Header；OpenAI 兼容接口，如 opencode zen 用 `https://opencode.ai/zen/v1`，推理模型需给足 `max_tokens`）、**模型归一重建**（`POST /admin/hot/models/rebuild-normalization`，先「预演」再「执行重建」，合并历史重复实体）。
- 页面标题统一由 `createMetadata(title, desc, { path, keywords })` 生成，形如 `{title} | 云林有风 | 寒枫的博客`。

---

## Tauri 桌面应用

配置位于 `src-tauri/`：
- `src/main.rs` - Rust 主程序
- `Cargo.toml` - Rust 依赖

构建命令：
```bash
npm run dev:tauri      # 开发模式
npm run tauri:build    # 生产构建
```

---

## 技术栈

- **框架**: Next.js 15.x + React 18.x
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS 4.x
- **UI**: Ant Design 5.x
- **桌面**: Tauri 2.x
- **PWA**: Serwist 9.x
- **测试**: Vitest + @testing-library/react + Playwright
