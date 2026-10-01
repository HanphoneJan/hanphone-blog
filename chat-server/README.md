# HanPhone Chat - Server

[![Node.js](https://img.shields.io/badge/Node.js-20.5+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-gray.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-white.svg)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](../LICENSE)

> 高性能的实时聊天应用后端服务，基于 Node.js + Express + Socket.IO + PostgreSQL 构建

## ✨ 特性

- 🚀 **实时通信** - 基于 Socket.IO 的 WebSocket 服务，支持大规模并发连接
- 🔐 **JWT 认证** - 基于 JSON Web Token 的身份认证，安全可靠
- 👥 **多角色支持** - 支持普通用户和管理员两种角色，不同的权限管理
- 🤖 **AI 智能回复** - 集成 Agent Service（Python FastAPI），提供智能对话与四层记忆能力
- 💾 **数据持久化** - PostgreSQL 数据库存储，支持完整的数据查询和管理
- 📊 **用户管理** - 完整的用户 CRUD 操作，支持在线状态追踪
- 🔔 **消息推送** - 实时消息推送和历史消息查询
- 🎯 **TypeScript** - 完整的类型定义，提供优秀的开发体验和代码提示
- 🌐 **CORS 支持** - 支持跨域访问，便于前后端分离部署
- 📈 **可扩展性** - 模块化设计，易于扩展和维护

## 🛠️ 技术栈

| 技术         | 版本    | 说明                       |
| ------------ | ------- | -------------------------- |
| Node.js      | >= 20.5 | JavaScript 运行时          |
| TypeScript   | 5.1.6   | 类型安全的 JavaScript 超集 |
| Express      | 4.18.2  | Web 应用框架               |
| Socket.IO    | 4.7.2   | WebSocket 服务端库         |
| PostgreSQL   | 13+     | 关系型数据库               |
| pg           | 8.8.0   | PostgreSQL 客户端          |
| jsonwebtoken | 9.0.2   | JWT 生成和验证             |
| bcryptjs     | 2.4.3   | 密码加密                   |
| cors         | 2.8.5   | 跨域资源共享               |
| dotenv       | 17.2.3  | 环境变量管理               |

## 📦 安装

### 环境要求

- Node.js >= 20.5.0
- pnpm >= 9
- PostgreSQL >= 13

### 克隆项目

```bash
git clone https://github.com/yourusername/hanphone-chat.git
cd hanphone-chat/server
```

### 安装依赖

项目使用 [pnpm](https://pnpm.io/)（>= 9）作为包管理器：

```bash
pnpm install
```

## ⚙️ 配置

### 1. 数据库设置

#### 安装 PostgreSQL

确保您已安装 PostgreSQL（推荐版本 13 或更高）。

#### 创建数据库

```sql
CREATE DATABASE chat_db;
```

### 2. 环境变量配置

复制 `.env.example` 文件为 `.env`，并更新以下配置：

```env
# 服务器配置
PORT=4010

# 数据库配置（主库 - 聊天数据）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_db
DB_USER=postgres
DB_PASSWORD=your_password

# Blog 服务 API（用户数据同步，不再直连 blog 数据库）
BLOG_API_URL=http://localhost:8080
BLOG_INTERNAL_KEY=your_blog_internal_key

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here
JWT_ISSUER=auth0

# Agent Service 地址
AGENT_SERVICE_URL=http://localhost:8001

# CORS 配置
ALLOWED_ORIGINS=http://localhost:4010,http://localhost:4011
```

### 3. 数据库表结构初始化

首次运行前，需要创建数据库表。可以使用以下 SQL 脚本：

```sql
-- 用户表
CREATE TABLE t_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    email VARCHAR(100),
    avatar VARCHAR(255),
    type VARCHAR(1) DEFAULT '0',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_time TIMESTAMP,
    login_province VARCHAR(50),
    login_city VARCHAR(50),
    login_lat DECIMAL(10, 6),
    login_lng DECIMAL(10, 6),
    isOnline BOOLEAN DEFAULT FALSE
);

-- 私信表
CREATE TABLE private_message (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    to_ai BOOLEAN DEFAULT FALSE,
    from_ai BOOLEAN DEFAULT FALSE
);

-- 创建索引
CREATE INDEX idx_message_sender ON private_message(sender_id);
CREATE INDEX idx_message_receiver ON private_message(receiver_id);
CREATE INDEX idx_message_timestamp ON private_message(timestamp DESC);
CREATE INDEX idx_user_username ON t_user(username);
CREATE INDEX idx_user_type ON t_user(type);

-- 插入管理员账号（默认密码: admin123）
INSERT INTO t_user (username, password, nickname, type) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', '管理员', '1');
```

## 🚀 使用

### 开发模式

```bash
pnpm dev
```

服务器将在 `http://localhost:4010` 启动

### 生产模式

```bash
# 编译 TypeScript
pnpm build

# 运行生产服务器
pnpm start
```

### 清理构建文件

```bash
pnpm clean
```

## 📁 项目结构

```
server/
├── src/
│   ├── authService.ts        # JWT 认证服务
│   ├── (已移除)              # AI 人设由 agent-service 管理
│   ├── postgresService.ts    # PostgreSQL 数据库服务
│   ├── server.ts             # 主服务器入口
│   └── types.ts              # TypeScript 类型定义
├── dist/                     # 编译输出目录
├── .env                      # 环境变量配置
├── .env.example             # 环境变量示例
├── ecosystem.config.cjs      # PM2 进程管理配置
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 项目文档
```

## 🔌 API 接口

### 认证接口

#### 用户登录

```http
POST /api/login
Content-Type: application/json

{
  "username": "janhizian",
  "password": "password"
}
```

**响应:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "janhizian",
    "nickname": "寒枫",
    "type": "0",
    "avatar": "..."
  }
}
```

#### 获取管理员信息

```http
GET /api/admin/info
Authorization: Bearer <token>
```

**响应:**

```json
{
  "success": true,
  "user": {
    "id": 1000,
    "username": "admin",
    "nickname": "管理员",
    "type": "1",
    "avatar": "..."
  }
}
```

### 用户接口

#### 获取所有用户（管理员专用）

```http
GET /api/users/all
Authorization: Bearer <token>
```

#### 获取在线用户

```http
GET /api/users
Authorization: Bearer <token>
```

### 消息接口

#### 获取与管理的聊天记录（普通用户）

```http
GET /api/messages/admin
Authorization: Bearer <token>
```

#### 获取与特定用户的聊天记录（管理员）

```http
GET /api/messages/:userId
Authorization: Bearer <token>
```

## 🔌 Socket.IO 事件

### 客户端到服务器事件

| 事件名                  | 参数                                                 | 说明                   |
| ----------------------- | ---------------------------------------------------- | ---------------------- |
| `authenticate`        | `token: string`                                    | Socket 连接认证        |
| `userMessage`         | `message: string, tempId?: string, toAi?: boolean` | 用户发送消息           |
| `adminMessage`        | `userId: number, message: string, tempId?: string` | 管理员发送消息         |
| `requestUserMessages` | `userId: number`                                   | 管理员请求用户历史消息 |
| `disconnect`          | -                                                    | 断开连接               |

### 服务器到客户端事件

| 事件名               | 参数                            | 说明         |
| -------------------- | ------------------------------- | ------------ |
| `message`          | `message: PrivateMessage`     | 新消息推送   |
| `aiStatus`         | `status: { status, message }` | AI 状态更新  |
| `notification`     | `message: string`             | 通知消息     |
| `userConnected`    | `user: User`                  | 用户上线通知 |
| `userDisconnected` | `userId: number`              | 用户下线通知 |
| `userListUpdated`  | `users: User[]`               | 用户列表更新 |
| `userMessages`     | `messages: PrivateMessage[]`  | 历史消息     |
| `error`            | `error: string`               | 错误消息     |

## 🎯 核心功能

### 1. 用户认证

- JWT Token 生成和验证
- 密码 bcrypt 加密存储
- Token 过期自动拒绝
- 用户登录状态记录

### 2. 实时消息

- WebSocket 双向通信
- 消息实时推送
- 消息持久化存储
- 已读/未读状态管理

### 3. AI 智能回复

- 消息转发至 Agent Service（Python FastAPI）
- 支持四层记忆（L1-L4）的上下文对话
- AI 思考/生成状态实时推送（SSE 流式转发）
- 支持多模式推理和工具调用

### 4. 用户管理

- 完整的用户 CRUD 操作
- 在线状态实时追踪
- 登录地理位置记录
- 用户类型权限控制

### 5. 消息历史

- 按时间戳排序的消息查询
- 支持用户/管理员双向查询
- 分页加载历史消息
- 消息过滤和搜索

## 🗄️ 数据库设计

### t_user 表（用户表）

| 字段            | 类型          | 说明                             |
| --------------- | ------------- | -------------------------------- |
| id              | SERIAL        | 主键                             |
| username        | VARCHAR(50)   | 用户名（唯一）                   |
| password        | VARCHAR(255)  | 密码哈希                         |
| nickname        | VARCHAR(50)   | 昵称                             |
| email           | VARCHAR(100)  | 邮箱                             |
| avatar          | VARCHAR(255)  | 头像 URL                         |
| type            | VARCHAR(1)    | 用户类型（0=普通用户，1=管理员） |
| create_time     | TIMESTAMP     | 创建时间                         |
| update_time     | TIMESTAMP     | 更新时间                         |
| last_login_time | TIMESTAMP     | 最后登录时间                     |
| login_province  | VARCHAR(50)   | 登录省份                         |
| login_city      | VARCHAR(50)   | 登录城市                         |
| login_lat       | DECIMAL(10,6) | 登录纬度                         |
| login_lng       | DECIMAL(10,6) | 登录经度                         |
| isOnline        | BOOLEAN       | 是否在线                         |

### private_message 表（私信表）

| 字段        | 类型      | 说明          |
| ----------- | --------- | ------------- |
| id          | SERIAL    | 主键          |
| sender_id   | INTEGER   | 发送者 ID     |
| receiver_id | INTEGER   | 接收者 ID     |
| content     | TEXT      | 消息内容      |
| timestamp   | TIMESTAMP | 消息时间      |
| is_read     | BOOLEAN   | 是否已读      |
| to_ai       | BOOLEAN   | 是否发送给 AI |
| from_ai     | BOOLEAN   | 是否来自 AI   |

## 🔧 核心模块

### AuthService

JWT 认证服务，提供 Token 生成和验证功能。

**主要方法:**

- `generateToken(payload)`: 生成 JWT Token
- `verifyToken(token)`: 验证 JWT Token
- `hashPassword(password)`: 密码加密
- `comparePassword(password, hash)`: 密码验证

### PostgresService

PostgreSQL 数据库服务，封装所有数据库操作。

**主要方法:**

- `createUser(user)`: 创建用户
- `findUserByUsername(username)`: 根据用户名查找用户
- `findUserById(id)`: 根据 ID 查找用户
- `updateUserOnlineStatus(userId, isOnline)`: 更新用户在线状态
- `saveMessage(message)`: 保存消息
- `getUserMessages(userId)`: 获取用户消息
- `getAllUsers()`: 获取所有用户
- `getOnlineUsers()`: 获取在线用户

### Socket.IO 连接管理

- 用户认证中间件
- 房间管理（用户 ID 作为房间名）
- 连接/断开事件处理
- 消息广播和定向推送

## 🤖 Agent Service 集成

Server 作为消息中转层，将 AI 相关请求转发给 Agent Service（Python FastAPI）。

**AI 回复流程:**

1. 用户发送消息，标记 `toAi: true`
2. 服务器接收消息，立即推送 `aiStatus: 'thinking'`
3. 通过 HTTP POST 将消息转发给 Agent Service (`/chat/message/stream`)
4. 接收 Agent Service 的 SSE 流式响应
5. 将流式事件通过 Socket.IO 实时推送给前端（`aiStreamChunk` / `aiStreamEnd`）
6. 如果出错，推送 `aiStatus: 'error'`

## 🚀 部署

### 使用 PM2 部署

```bash
# 1. 安装 PM2 与依赖
npm install -g pm2
pnpm install

# 2. 编译 TypeScript
pnpm build

# 3. 启动服务（自动加载 server/.env，应用名：hanphone-chat-server）
pm2 start ecosystem.config.cjs

# 4. 保存进程列表（开机自启）
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart hanphone-chat-server

# 停止 / 删除
pm2 stop hanphone-chat-server
pm2 delete hanphone-chat-server
```

> `ecosystem.config.cjs` 已通过 `node_args: "--import=dotenv/config"` 自动加载 `.env`，
> 启动前请确保已复制 `server/.env.example` 为 `server/.env` 并填好配置。

### Docker 部署

仓库已内置 `server/Dockerfile`（pnpm 构建，多阶段精简）：

```bash
# 构建镜像
docker build -t hanphone-chat-server .

# 运行（挂载 .env）
docker run -d --name hanphone-server \
  -p 4010:4010 \
  --env-file .env \
  hanphone-chat-server
```

> 完整全栈（PostgreSQL + Qdrant + Agent + Server + Client）请使用仓库根目录的
> `docker compose up -d`，见根目录 `README.md`。
