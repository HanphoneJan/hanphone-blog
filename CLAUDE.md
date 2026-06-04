# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
pnpm build:photo-wall              # Build photo wall (Vite → web/public/atlas/)

# === File services ===
pnpm --filter admin-file start     # Express file service (port 4000)
# photo-wall-server: node app.js (port 4001)

# === Backend security regression tests ===
cd server && python3 test.py       # 39 security test cases
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

### Data Flow

- Next.js frontend calls Spring Boot REST API at `NEXT_PUBLIC_API_BASE_URL` (default `https://hanphone.cn/api`)
- File uploads go to `admin-file` Express service on separate domain (`hanphone.top`)
- Photo wall has its own Express backend (`photo-wall-server`) on port 4001
- Backend uses PostgreSQL (primary DB) + Redis (caching, rate limiting, sessions)
- JWT-based auth: TokenInterceptor validates tokens on admin endpoints (`/admin/**`); public endpoints use IndexController/UserController etc.

### Frontend Architecture (web/src/)

- **App Router**: Pages in `app/(main)/` (public) and `app/admin/` (dashboard)
- **Static sub-apps**: Gomoku and photo wall are built separately and copied to `web/public/games/` and `web/public/atlas/`; Next.js rewrites serve them at `/games/`, `/tools/`, `/play/`, `/atlas/`
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

### Environment Variables

- Frontend env: copy `web/env.example` → `web/.env.local`
- Backend env: copy `server/env.example` → `server/.env`
- Internal service auth: `INTERNAL_API_KEY` in backend `.env` for service-to-service calls (e.g., hanphone-chat → blog API)

## CI (GitHub Actions)

Three jobs on push/PR to main: server tests (Maven), web unit tests (Vitest), build verification (Gomoku + Photo Wall + Web). See `.github/workflows/ci.yml`.

## Key Documentation

- [前端开发指南](web/README.md) / [前端技术文档](web/TECHNICAL_DOCUMENT.md)
- [后端开发指南](server/README.md) / [后端技术文档](server/TECHNICAL_DOCUMENT.md)
- [测试指南](TESTING.md)
- [Docker 部署](server/DOCKER_DEPLOYMENT.md)
- [Swagger 使用说明](server/SWAGGER_USAGE.md)
