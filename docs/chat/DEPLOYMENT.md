# HanPhone Chat 生产环境部署指南

> 📦 本服务原属独立仓库 `HanphoneJan/hanphone-chat`，现已并入本仓库：源码在 `chat-server/`、
> 前端在 `apps/chat-client/`（nginx `/chat/` 托管）、协议见本目录 `android-protocol.md`。
> 生产仍按以下 PM2（进程名 `hanphone-chat-server`）或 Docker 方式部署；改动源码后需
> `pnpm --filter chat-server build` 再重启进程。

> 覆盖两种生产部署方式：**方案 A：Docker Compose（推荐，一键全栈）** 与
> **方案 B：PM2 + Nginx 裸机部署（进程可控，便于运维）**。
> 全部 Node.js 组件统一使用 **pnpm**（>= 9）作为包管理器。

---

## 目录

- [一、架构总览](#一架构总览)
- [二、前置条件](#二前置条件)
- [三、基础设施准备](#三基础设施准备)
- [四、环境变量配置](#四环境变量配置)
- [五、方案 A：Docker Compose 全栈部署](#五方案-adocker-compose-全栈部署)
- [六、方案 B：PM2 + Nginx 裸机部署](#六方案-bpm2--nginx-裸机部署)
- [七、部署验证](#七部署验证)
- [八、PM2 运维命令](#八pm2-运维命令)
- [九、升级与回滚](#九升级与回滚)
- [十、故障排查](#十故障排查)

---

## 一、架构总览

```
                 ┌────────────────────────────────────────────┐
                 │                    Nginx                    │
                 │   /chat/  静态资源（Client 构建产物）        │
                 │   /api             → Server:4010            │
                 │   /chat-api/socket.io → Server:4010 (WS)    │
                 └────────────────────────────────────────────┘
                      │                     │
        ┌─────────────▼───────────┐  ┌─────▼──────────────────┐
        │  Server (Node.js)       │  │  Client (React)        │
        │  Express + Socket.IO    │  │  Vite 构建静态产物      │
        │  :4010                  │  │  base: /chat/          │
        └──────┬──────────┬───────┘  └────────────────────────┘
               │          │
               │          └──────────────┐
        ┌──────▼──────────────┐   ┌──────▼──────────────┐
        │  PostgreSQL         │   │  Agent Service      │
        │  chat_db (聊天数据)  │   │  Python FastAPI     │
        │  blog   (用户数据)   │   │  :8001              │
        └─────────────────────┘   └──────┬──────────────┘
                                         │
                                   ┌─────▼──────────────┐
                                   │  Qdrant (向量库)    │
                                   │  :6333             │
                                   └────────────────────┘
```

**端口一览**

| 组件          | 端口 | 暴露范围     | 说明                     |
| ------------- | ---- | ------------ | ------------------------ |
| Server        | 4010 | 内网 / Nginx | HTTP + WebSocket        |
| Agent Service | 8001 | 仅内网       | Python AI 服务          |
| Qdrant        | 6333 | 仅内网       | 向量数据库（建议绑定 127.0.0.1） |
| PostgreSQL    | 5432 | 仅内网       | 数据库                  |
| Client/Nginx  | 80   | 公网         | 静态资源 + 反向代理      |

> **安全提示**：仅 Nginx（80 端口）暴露公网；Server、Agent、Qdrant、PostgreSQL 均不应直接暴露公网。

---

## 二、前置条件

| 依赖        | 版本要求  | 验证命令            |
| ----------- | --------- | ------------------- |
| Node.js     | >= 20.6   | `node -v`         |
| pnpm        | >= 9      | `pnpm -v`         |
| Python      | >= 3.11   | `python -V`       |
| PostgreSQL  | >= 13     | `psql --version`  |
| PM2（方案B）| 最新      | `pm2 -v`          |
| Docker（方案A）| 最新   | `docker --version` |

**安装 pnpm**（二选一）：

```bash
# 方式一：corepack（Node 自带）
corepack enable

# 方式二：npm 全局安装
npm install -g pnpm
```

> Server / Client 目录均含 `pnpm-lock.yaml`，请使用 `pnpm install` 安装，不要混用 npm，避免 lockfile 不一致。

---

## 三、基础设施准备

### 3.1 创建 chat_db 数据库

```bash
psql -h localhost -U postgres -c "CREATE DATABASE chat_db;"
```

> chat_db 的表结构由 Agent Service 启动时自动创建（SQLAlchemy `create_all`），无需手动建表。
> 完整建表脚本可参考仓库根目录 `init.sql`。

### 3.2 确认 blog 用户库可连接

Server 通过 Blog 服务 API 同步用户数据（不再直连 blog 库），需确认：

```bash
curl http://localhost:8080/api/actuator/health   # Blog 服务健康检查
```

### 3.3 启动 Qdrant（方案 B 需手动，方案 A 由 Compose 托管）

```bash
docker run -d --name hanphone-qdrant \
  -p 127.0.0.1:6333:6333 \
  -v qdrant_data:/qdrant/storage \
  qdrant/qdrant:latest
```

> 如不需要长期记忆（L3）/ RAG，可在 `agent-service/.env` 设置 `ENABLE_VECTOR_STORE=false` 跳过 Qdrant。

---

## 四、环境变量配置

### 4.1 Server — `server/.env`

```bash
cp server/.env.example server/.env
```

```env
PORT=4010

# JWT（必填，与签发 token 的博客服务一致）
JWT_SECRET=请填入强随机密钥
JWT_ISSUER=auth0

# 主数据库（聊天数据）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_db
DB_USER=postgres
DB_PASSWORD=你的数据库密码

# Blog 服务 API（用户数据同步）
BLOG_API_URL=http://localhost:8080
BLOG_INTERNAL_KEY=your_blog_internal_key

# Agent Service 地址
AGENT_SERVICE_URL=http://localhost:8001

# Server → Agent Service 通信密钥（两边保持一致，生产必须配置）
INTERNAL_API_KEY=请填入强随机密钥

# CORS 白名单
ALLOWED_ORIGINS=http://localhost:4010,http://localhost:4011
```

### 4.2 Agent Service — `agent-service/.env`

```bash
cp agent-service/.env.example agent-service/.env
```

```env
# LLM 配置（必填）
OPENAI_API_KEY=sk-你的API密钥
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-v4-pro

# 数据库（连接 chat_db）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_db
DB_USER=postgres
DB_PASSWORD=你的数据库密码

# 向量数据库
ENABLE_VECTOR_STORE=true
QDRANT_URL=http://localhost:6333

# 内部通信密钥（与 server/.env 保持一致）
INTERNAL_API_KEY=请填入与 Server 相同的密钥

# 嵌入模型（L3 长期记忆 + RAG）
EMBEDDING_API_KEY=你的嵌入模型API密钥
EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_MODEL=text-embedding-v4

# 搜索工具（可选）
TAVILY_API_KEY=你的Tavily密钥

# 生产环境必须关闭调试
DEBUG=false
ALLOWED_ORIGINS=http://localhost:4010,http://localhost:4011
```

### 4.3 Client — `client/.env`（必配，构建期内联）

> `VITE_*` 变量在**构建时**内联进产物，修改后必须重新构建 Client。
> 客户端是直接字符串拼接（`client/src/config/api.ts`），未配置的变量会被拼成 `undefined/api/...` 而静默失效，因此**不要留空**。

**同源部署（Nginx 反代，推荐）** —— 使用相对路径 `/chat-api`，正好匹配 Nginx `location /chat-api` 与服务端 `/chat-api/api/*` 路由：

```env
# 聊天后端（同源相对路径，必须）
VITE_API_BASE_URL=/chat-api

# 博客登录后端（必填！登录走 blog 服务，端口 8090，见下）
VITE_AUTH_BASE_URL=http://localhost:8090

# Socket.IO（留空 = 同源，自动连 /chat-api/socket.io）
VITE_SOCKET_URL=
```

**跨域部署**（前后端不同域）则填写完整地址：

```env
VITE_API_BASE_URL=https://api.example.com/chat-api
VITE_SOCKET_URL=https://api.example.com
VITE_AUTH_BASE_URL=https://blog.example.com
```

> **关于 `VITE_AUTH_BASE_URL`**：登录接口 `POST /api/login` 由 **blog 服务**（Spring Boot，默认端口 8090）提供（见 `hanphone-blog/server` 的 `UserController`）。客户端会将 `${VITE_AUTH_BASE_URL}/api/login` 拼成登录 URL（见 `client/src/config/api.ts`），因此这里填 **blog 服务的根地址**（如 `http://localhost:8090`），不要带 `/api` 后缀。聊天后端没有登录路由，即使前后端同域也**必须**配置此项。

---

## 五、方案 A：Docker Compose 全栈部署

适合快速上线、无需手动管理进程的场景。仓库根目录 `docker-compose.yml` 已编排全部组件。

### 5.1 准备配置

```bash
# 1. 复制环境变量模板
cp server/.env.example server/.env
cp agent-service/.env.example agent-service/.env

# 2. 编辑并填入真实密钥（见第四节）
```

**Client 构建参数**：`docker compose` 会在构建 client 镜像时读取宿主环境（或仓库根 `.env`）中的以下变量并注入 `client/Dockerfile`（已设默认值）：

| 变量                    | 默认值     | 说明                                                     |
| ----------------------- | ---------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL`   | `/chat-api` | 同源相对路径，Nginx 反代 `/chat-api` → server:4010       |
| `VITE_AUTH_BASE_URL` | （空）      | **必填**，blog 登录后端根地址（如 `http://localhost:8090`）|
| `VITE_SOCKET_URL`     | （空）      | 留空 = 同源                                              |

启动前把 `VITE_AUTH_BASE_URL` 写入仓库根 `.env`（或在 shell 中 export）：

```bash
echo "VITE_AUTH_BASE_URL=http://localhost:8090" >> .env
```

### 5.2 启动全栈

```bash
# 构建镜像并后台启动
docker compose up -d --build

# 查看状态（全部应为 healthy / running）
docker compose ps
```

### 5.3 常用命令

```bash
docker compose logs -f server        # 查看 Server 日志
docker compose logs -f agent-service # 查看 Agent 日志
docker compose restart server        # 重启 Server
docker compose down                  # 停止（保留数据卷）
docker compose down -v               # 停止并删除数据卷（慎用！）
```

> 数据卷 `postgres_data`、`qdrant_data` 会持久化数据，`down` 不会丢失。

---

## 六、方案 B：PM2 + Nginx 裸机部署

适合单机/多机部署、进程级监控、日志管理。

### 6.1 安装依赖并构建 Server

```bash
cd server
pnpm install --frozen-lockfile
pnpm build          # 产出 dist/
pnpm clean && pnpm build   # 若需全新构建
```

### 6.2 启动 Agent Service

```bash
cd agent-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 使用 uvicorn 多 worker 启动（建议配合 systemd 或 pm2 守护）
python -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --workers 2
```

> Agent Service 首次启动会自动在 chat_db 创建数据表。建议用 systemd 守护（示例见 6.6）。

### 6.3 使用 PM2 启动 Server

`server/ecosystem.config.cjs` 已配置好（自动加载 `.env`、日志、内存上限）：

```js
module.exports = {
  apps: [
    {
      name: "hanphone-chat-server",
      cwd: __dirname,
      script: "./dist/server.js",
      node_args: "--import=dotenv/config",   // 自动加载 server/.env
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: { NODE_ENV: "production" },
      out_file: "./logs/pm2.out.log",
      error_file: "./logs/pm2.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
```

```bash
npm install -g pm2

cd server
pm2 start ecosystem.config.cjs
pm2 save                                  # 保存进程列表
pm2 startup                               # 配置开机自启（按输出提示执行）

pm2 status                                # 状态应为 online
```

### 6.4 构建 Client

```bash
cd client
pnpm install --frozen-lockfile
pnpm build                                # 产出 dist/
```

将 `client/dist/` 部署到 Nginx 静态目录（`/usr/share/nginx/html` 或自定义路径）。

### 6.5 Nginx 反向代理配置

创建 `/etc/nginx/conf.d/hanphone-chat.conf`：

```nginx
# 仅在 WebSocket 升级请求时传递 Connection: upgrade，普通 HTTP 请求保持默认
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name chat.example.com;

    # Client 静态资源（base 为 /chat/）
    root /var/www/hanphone-chat;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /chat/index.html;
    }

    # 聊天后端（REST /chat-api/api/... 与 WebSocket /chat-api/socket.io 都走这一条）
    location /chat-api {
        proxy_pass http://127.0.0.1:4010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 300s;
    }

    # 健康检查端点放行
    location = /health {
        proxy_pass http://127.0.0.1:4010;
    }

    # 静态资源长缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
nginx -t && nginx -s reload
```

> 如需 HTTPS，用 certbot 一键签发并替换 80 端口配置。

### 6.6 （可选）用 systemd 守护 Agent Service

创建 `/etc/systemd/system/hanphone-agent.service`：

```ini
[Unit]
Description=HanPhone Agent Service
After=network.target

[Service]
User=youruser
WorkingDirectory=/path/to/agent-service
ExecStart=/path/to/agent-service/venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now hanphone-agent
```

---

## 七、部署验证

```bash
# 1. Server 健康检查
curl http://127.0.0.1:4010/health
# {"status":"healthy","service":"hanphone-server",...}

# 2. Agent Service 健康检查
curl http://127.0.0.1:8001/health
# {"status":"healthy","active_skill":{"id":"hanphone",...}}

# 3. Qdrant 健康检查
curl http://127.0.0.1:6333/healthz

# 4. 前端页面
curl -I http://localhost/chat/        # 应返回 200

# 5. PM2 状态
pm2 status

# 6. 浏览器验证
#    打开 http://localhost/chat/ → 登录 → 发消息 → 确认 AI 回复与实时推送
```

---

## 八、PM2 运维命令

```bash
pm2 list                    # 进程列表
pm2 logs hanphone-chat-server          # 实时日志
pm2 logs --lines 200 hanphone-chat-server  # 最近 200 行
pm2 restart hanphone-chat-server       # 重启
pm2 reload hanphone-chat-server        # 平滑重启（load 均衡）
pm2 stop hanphone-chat-server          # 停止
pm2 delete hanphone-chat-server        # 删除进程（不删除 dist）
pm2 monit                   # 资源监控面板
pm2 save                    # 保存当前进程列表
pm2 startup                 # 开机自启
```

---

## 九、升级与回滚

### 升级流程

```bash
# 1. 拉取最新代码
git pull

# 2. 更新依赖并重新构建 Server
cd server
pnpm install --frozen-lockfile
pnpm build

# 3. 滚动重启
pm2 restart hanphone-chat-server

# 4. 若前端有改动，重新构建并部署 dist
cd client
pnpm install --frozen-lockfile
pnpm build
# 将 dist 同步到 Nginx 目录
```

### 回滚

```bash
# Server：切回上一个 git tag/commit 后重新构建重启
git checkout <上一个版本tag>
pnpm build
pm2 restart hanphone-chat-server

# 前端：保留上一版本 dist 目录，Nginx 指向回滚即可
# 数据库：chat_db 建议每日 pg_dump 备份
```

### 数据备份

```bash
# chat_db 每日备份
pg_dump -h localhost -U postgres chat_db | gzip > chat_db_$(date +%F).sql.gz

# Qdrant 数据目录备份（数据卷）
docker run --rm -v qdrant_data:/data -v $PWD:/backup alpine tar czf /backup/qdrant_$(date +%F).tar.gz -C /data .
```

---

## 十、故障排查

| 现象                                | 排查方向                                                         |
| ----------------------------------- | ---------------------------------------------------------------- |
| Server 启动报"环境变量未定义"       | 确认 `server/.env` 存在；PM2 方式确认 `node_args: --import=dotenv/config` |
| 页面能打开但登录 502               | 检查 Blog 服务 `BLOG_API_URL` 是否可达、`BLOG_INTERNAL_KEY` 是否匹配 |
| AI 无回复                          | Agent Service 是否 healthy；`AGENT_SERVICE_URL`/`INTERNAL_API_KEY` 是否一致 |
| WebSocket 连不上                   | Nginx 是否代理 `/chat-api` 前缀且含 `Upgrade`/`Connection` 头 |
| 长期记忆不生效                     | `ENABLE_VECTOR_STORE=true` 且 Qdrant 可达；维度改动需删 collection 重建 |
| 404 / 刷新白屏                     | Nginx `try_files $uri $uri/ /chat/index.html;` 是否正确          |
| PM2 反复重启（loop）               | `pm2 logs` 查看报错；`max_memory_restart` 是否过低；检查 dist 是否构建成功 |
| CORS 跨域报错                      | Server `ALLOWED_ORIGINS` 与前端实际域名一致；Agent `ALLOWED_ORIGINS` 同步配置 |

---

## 附：相关文档

- [开发环境搭建](../../DEVELOPMENT_SETUP.md) — 本地从零启动
- [Server 部署说明](../../server/README.md) — Server 组件文档
- [Agent Service Docker 部署](../../agent-service/AGENT_SERVICE_DOCKER_DEPLOY.md) — Agent 组件 Docker 教程
- [CLAUDE.md](../../CLAUDE.md) — 项目开发指南

> 📅 文档更新时间：2026-09-17