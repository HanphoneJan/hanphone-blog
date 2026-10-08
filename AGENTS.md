# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

个人博客系统 (Hanphone's Blog / 云林有风)，前后端分离架构，pnpm workspace monorepo。

## Key Commands

```bash
# Install all workspace dependencies
pnpm install

# === Frontend (web/) ===
pnpm --filter web dev              # Next.js dev server (port 3000)
pnpm --filter web build            # Production build
pnpm --filter web lint             # ESLint (flat config)
pnpm --filter web test             # Vitest unit tests
pnpm --filter web test:watch       # Vitest watch mode

# === Backend (server/) ===
cd server && mvn spring-boot:run   # Spring Boot dev (port 8090)
cd server && mvn test              # Java unit tests
cd server && mvn clean package -DskipTests  # Build JAR

# === Sub-apps ===
pnpm build:gomoku                  # Build gomoku game (Uni-app → web/public/games/gomoku/)
pnpm build:photo-wall              # Build photo wall (Vite → apps/photo-wall/atlas/；生产由 nginx alias /home/hanphone/html/atlas 托管)
pnpm build:chat                    # Build chat client (React → apps/chat-client/dist；nginx /chat/ 托管)
pnpm --filter chat-server dev      # Chat server (port 4010，/chat-api；生产 pm2 hanphone-chat-server)

# === File services ===
pnpm --filter admin-file start     # Express file service (port 4000)
# photo-wall-server: node app.js (port 4001)

# === Backend security regression tests ===
cd server && python3 test.py       # 39 security test cases；注册/找回密码用例需本地 Redis + redis-py（从 Redis 读取验证码）
```

## Architecture

### Monorepo Structure

| Package               | Directory              | Stack                                                   |
| --------------------- | ---------------------- | ------------------------------------------------------- |
| `hanphone-blog-web`     | `web/`               | Next.js 15 + React 18 + TypeScript + Tailwind CSS 4     |
| `blog`              | `server/`            | Spring Boot 3.2.12 + Java 17 + JPA + MyBatis-Plus 3.5.9 |
| `admin-file`        | `admin-file/`        | Express.js 5 + Multer (file storage)                    |
| `photo-wall-server` | `photo-wall-server/` | Express.js 5 + PostgreSQL                               |
| `uni-preset-vue`    | `apps/gomoku/`       | Uni-app 3 + Vue 3                                       |
| `atlas`             | `apps/photo-wall/`   | Vue 3 + Vite + Element Plus + Pinia                     |
| `chat-client`       | `apps/chat-client/`  | React 18 + Vite + shadcn/ui + socket.io-client（聊天站，nginx `/chat/` 托管，base `/chat/`） |
| `chat-server`       | `chat-server/`       | Express 4 + socket.io + PostgreSQL（聊天/私信实时服务，`/chat-api`，独立 pm2/DB） |
| `android`           | `android/`           | Kotlin 2.0 + Jetpack Compose (M3) + Retrofit            |

### Data Flow

- Next.js frontend calls Spring Boot REST API at `NEXT_PUBLIC_API_BASE_URL` (default `https://hanphone.cn/api`)
- File uploads go to `admin-file` Express service on separate domain (`hanphone.top`)
- Photo wall has its own Express backend (`photo-wall-server`) on port 4001
- Backend uses PostgreSQL (primary DB) + Redis (rate limiting, sessions, captcha); hot public reads (tags/types/site-stats) cached in-process via Caffeine (TTL 300s, evicted on writes)
- JWT-based auth: TokenInterceptor validates tokens on admin endpoints (`/admin/**`); public endpoints use IndexController/UserController etc.

### Frontend Architecture (web/src/)

- **App Router**: Pages in `app/(main)/` (public) and `app/admin/` (dashboard)
- **热点聚合页** `/insight`（「分享」菜单 → 热点聚合）：GitHub / HF / AI 要闻 热点流 + 模型榜单（文本 / 代码 / Agent / Embedding / 生图 / 生视频 / 语音）+ 综合对比（能力雷达 / 价格散点 / 明细表，可导出图片与分享链接）。页面为 `force-dynamic` 按请求渲染，服务端经内网 `API_INTERNAL_BASE_URL` 取数；后台 `/admin/insight`（导航「聚合数据」）可异步触发采集并配置 AI 摘要（URL/Key/Model/自定义 Header）。
- **Static sub-apps**: Gomoku builds to `web/public/games/` and is served by Next.js rewrites at `/games/`. Photo wall (`apps/photo-wall`) builds to its own `atlas/` and is served **by nginx alias** `/home/hanphone/html/atlas` at `/atlas/` (不在 Next.js / `web/public/` 内托管)
- **PWA**: Serwist v9 service worker (`app/sw.ts`) with offline page
- **Desktop**: Tauri 2 wrapper in `src-tauri/` packages as Windows desktop app
- **Themes**: 4 themes (light, dark, macaron, cyberpunk) via CSS custom properties + Tailwind variants; theme persisted in cookie set by middleware
- **Middleware** (`middleware.ts`): Domain redirect (non-www → www), theme cookie, security headers

### Backend Architecture (server/src/main/java/com/example/blog/)

- **Layered**: `web/` (controllers) → `service/impl/` → `dao/` (JPA repositories)
- **Security filters**: `XssFilter` (param escaping), `RequestValidationFilter` (URL length limits, recursive path blocking)
- **JWT interceptor**: `TokenInterceptor` protects `/admin/**` routes
- **Swagger**: SpringDoc OpenAPI 3 at `/swagger-ui/index.html`; public and admin controllers separated
- **Two query layers**: JPA repositories in `dao/` for most queries, MyBatis-Plus for some complex ones
- **热点聚合（Insight）**：`hot/` 包，采集器接口 `HotCollector`（热点条目）与 `ModelLeaderboardCollector`（模型榜单），`HotCollectScheduler` 每日 03:30 采集、`HotTriggerService` 提供后台异步手动触发。表：`hot_source` / `hot_item` / `hot_item_snapshot` / `hot_collect_run` / `hot_setting` / `model_entity` / `model_alias` / `model_benchmark` / `model_benchmark_snapshot` / `model_pricing` / `benchmark_meta`。公开接口 `/hot/{overview,feed,sources,leaderboards,benchmarks,models,vendors}`（`models` 支持 `q`/`vendor`/`sort=newest|name|price|context`/`limit`；`vendors` 返回归一后的厂商、重点厂商置顶），管理接口 `/admin/hot/*`（`collect` 异步、`status`、`settings/summary`）。信源：GitHub、Hugging Face（可用 `HF_ENDPOINT` 镜像）、AI 要闻（RSS）、Artificial Analysis、LMArena（可关）、MTEB、SWE-bench、Terminal-Bench、VBench、OpenRouter。厂商归一/重点排序见 `hot/model/VendorRegistry`（合并大小写、连字符、子品牌别名，如 Alibaba/Alibaba-ATH/Qwen、z-ai/Z.ai、Mistral/mistralai）。

### Environment Variables

- Frontend env: copy `web/env.example` → `web/.env.local`
- Backend env: copy `server/env.example` → `server/.env`
- Internal service auth: `INTERNAL_API_KEY` in backend `.env` for service-to-service calls (e.g., hanphone-chat → blog API)
- Visitor IP geo stats: `GEO_DB_PATH` in backend `.env` points to a **DB-IP City Lite** mmdb file (globally covers IP→country/region; missing file degrades to "unknown region"). Auto-update monthly via `server/scripts/update-dbip.sh` (see `server/DEPLOYMENT.md` §7). Frontend world map displays country names in Chinese via `web/src/lib/countryZh.ts` mapping.
- 热点聚合：`GITHUB_TOKEN`（GitHub 配额）、`AA_API_KEY`（Artificial Analysis 免费 key）、`HF_ENDPOINT`（国内可设 `https://hf-mirror.com`）、`HOT_LMARENA_ENABLED`、`HOT_PROXY`（服务器侧代理，如 `http://127.0.0.1:7890`；**仅 LMArena 走它**，因为 `datasets-server.huggingface.co` 国内直连不可达——服务器跑 mihomo 见 server/DEPLOYMENT.md §8）、`HOT_COLLECT_ENABLED` / `HOT_COLLECT_CRON`；AI 摘要可用 `HOT_SUMMARY_*` 或在后台「聚合数据」配置 URL/Key/Model/自定义 Header（**注意**：opencode zen 的 OpenAI 兼容路径是 `/zen/v1` 不是 `/zen/go/v1`；推理模型 `max_tokens` 要给足否则空摘要）。前端服务端取内网后端用 `API_INTERNAL_BASE_URL`（**直连 8090，无 `/api` 前缀**，nginx 才加 `/api`）。榜单口径/归一/采集器的坑见 server/TECHNICAL_DOCUMENT.md「热点聚合」→「经验与坑」。
- 网易云音乐 Cookie 自动刷新：外部 cron 调用 `GET /next-api/cron/refresh-netease-cookie/`（须带尾斜杠 + `x-internal-key`），见 `web/CRON_SETUP.md`。

## CI (GitHub Actions)

Three jobs on push/PR to main: server tests (Maven), web unit tests (Vitest), build verification (Gomoku + Photo Wall + Web). See `.github/workflows/ci.yml`.

## Key Documentation

- [前端开发指南](web/README.md) / [前端技术文档](web/TECHNICAL_DOCUMENT.md)
- [后端开发指南](server/README.md) / [后端技术文档](server/TECHNICAL_DOCUMENT.md)
- [测试指南](TESTING.md)
- [部署指南](server/DEPLOYMENT.md)（Systemd / Docker）
- [Swagger 使用说明](server/SWAGGER_USAGE.md)
- [Android 客户端 AI 交接文档](android/HANDOVER.md)（架构/接口坑/设计规范/踩坑记录/开发规矩 —— 接手 Android 开发必读）
- [聊天协议/部署文档](docs/chat/)（`android-protocol.md` ← App 对接 hanphone-chat 的协议"唯一事实来源"；`DEPLOYMENT.md` 生产部署；`technical/` 设计文档）
