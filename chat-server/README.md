# HanPhone Chat · Server

博客的聊天 / 私信实时服务：**Express 4 + socket.io + PostgreSQL**，复用博客 JWT 鉴权；
AI 人设与流式回复由 agent-service 提供。生产由 nginx 以 `/chat-api` 反代，pm2 进程名 `hanphone-chat-server`。

| 文档 | 内容 |
| --- | --- |
| [`docs/chat/DEPLOYMENT.md`](../docs/chat/DEPLOYMENT.md) | 生产部署（数据库、环境变量、Compose、nginx、排障） |
| [`docs/chat/android-protocol.md`](../docs/chat/android-protocol.md) | 客户端协议（**唯一事实来源**） |
| [`docs/chat/technical/`](../docs/chat/technical/) | 架构、核心设计、关键算法 |

## 技术栈

Node 18+ / TypeScript · Express 4 · socket.io 4 · PostgreSQL（`chat_db`）· JWT · FCM（可选）

## 本地开发

```bash
cd chat-server
pnpm install
cp .env.example .env          # 按需改 JWT_SECRET / 数据库
# 在 chat_db 中执行仓库根目录的 init.sql 建表
pnpm dev                      # http://localhost:4010
```

生产：`pnpm build && pnpm start`。

## 环境变量

完整列表见 `.env.example`，关键项：

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口，默认 4010 |
| `JWT_SECRET` / `JWT_ISSUER` | 必须与博客后端一致 |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | 聊天库 `chat_db` |
| `BLOG_API_URL` / `BLOG_INTERNAL_KEY` | 用户资料走博客 API，不直连 blog 库；key 等于博客的 `INTERNAL_API_KEY` |
| `AGENT_SERVICE_URL` / `INTERNAL_API_KEY` | agent-service 地址与共享密钥（不配则关闭内部认证） |
| `FCM_SERVICE_ACCOUNT` / `FCM_PROXY` | 可选；不配推送整体关闭，国内服务器需代理访问 Google |
| `ALLOWED_ORIGINS` | CORS 白名单，逗号分隔 |

## 鉴权与数据

- Socket 连接后 10 秒内发 `authenticate(blogJWT)`，否则断开；HTTP 接口用 `Authorization: Bearer <token>`。
- 消息/会话存 `chat_db`；用户资料经博客 API 获取，不在聊天库冗余。
- 详细事件与字段见 `docs/chat/android-protocol.md`。

## 部署

```bash
pnpm build
pm2 start ecosystem.config.cjs        # 自动读 .env，进程名 hanphone-chat-server
pm2 save
pm2 logs hanphone-chat-server
```

Docker / Compose（含 agent-service、Qdrant）见 `docs/chat/DEPLOYMENT.md`。

## 目录

```
src/
├── server.ts             # 入口：Express + socket.io
├── authService.ts        # JWT 校验
├── blogApiClient.ts      # 调博客内部 API 取用户
├── postgresService.ts    # chat_db 读写
├── publicRoom*.ts        # 公共聊天室 + AI 流式
├── pushService.ts        # FCM 推送
└── types.ts
```
