# Android 客户端（云林有风 App）对接协议要点

> 消费方：`android/` 的 `ChatSocket.kt` / `ChatScreen.kt`。
> 修改本服务的 socket 事件、鉴权流程、超时参数前，务必核对本文档，避免悄悄打破 App 端。

## 连接参数

| 项 | 值 | 说明 |
|----|-----|------|
| URL | `https://hanphone.cn` | |
| path | `/chat-api/socket.io` | |
| 认证 | 连接成功后 emit `authenticate`（**裸 token**，不带 Bearer 前缀） | 服务端 10s 内未认证成功会断开（`authTimeout`） |
| 心跳 | 认证成功后每 **25s** emit `heartbeat` | 服务端 60s 无心跳强制断连（`HEARTBEAT_TIMEOUT_MS`）；Web 端同为 25s |
| 重连 | socket.io 自动重连（1~5s 退避） | 每次 `connect` 后需重新 `authenticate` + `requestPublicHistory` |

## 使用的事件（App 端已实现）

### 聊天室（公共房间）
- `requestPublicHistory` `{limit: 100}` → `publicHistory`（数组，snake_case 字段：`user_id`/`from_ai`...）
- `publicMessage`（发消息）→ `publicMessageBroadcast`
- `@AI` 流式：`publicAiStreamStart` / `publicAiStreamChunk` / `publicAiStreamEnd` / `publicAiStreamError`
- `publicOnlineCount` `{count}`
- `messageDeleted` `{messageId}`
- `notification`（服务端提示，App 以 toast 展示）

### 私信
- 普通用户发：`userMessage`（content）→ 服务端向 `ADMIN_ROOM` 与本人 emit `message`
- 管理员发：`adminMessage`(userId, content)
- 接收：`message`（PrivateMessage，camelCase：`senderId`/`receiverId`/`fromAi`/`isRead`...）

### 已读回执
- 客户端「进入会话即标记已读」：emit `markConversationRead(peerUserId)`（`peerUserId` = 对方用户 ID。
  普通用户与管理员会话传 `1000`；管理员与某用户会话传该用户 ID）
- 服务端处理：把「对方发给本人」的消息在 DB 置 `is_read = true`，并向**对方**的房间广播：
  - `conversationRead` `{ peerUserId, readUpToMessageId }` —— 对方据此把自己发出的、`id <= readUpToMessageId`
    的消息标记为已读（断线/延迟补拉历史时由 REST 的 `isRead` 兜底）

### REST（Bearer 鉴权）
| 接口 | 说明 |
|------|------|
| `GET /chat-api/api/messages/admin` | 普通用户取与管理员的历史（`requireRegularUser`，管理员调用返回 403）；支持 `?limit=`（1~500，默认 200，返回最近 N 条）。消息 `isRead` 为 DB 真实已读状态 |
| `GET /chat-api/api/messages/{userId}` | 管理员取与指定用户的历史（`requireAdmin`）；支持 `?limit=` 同上。`isRead` 同上 |
| `GET /chat-api/api/users/all` | 管理员收件箱用户列表 |
| `GET /chat-api/api/users/unread` | 管理员收件箱未读数：`{ success, unread: [{ userId, count }] }`，`count` = 该用户发给管理员且未读的消息数 |

## 在线状态

- 连接（`authenticate` 成功）即在线；多设备可同时在线，任一连接存活即在线。
- 最后一个连接断开后进入 **60s 下线宽限期**（`OFFLINE_GRACE_MS`）：期间重连则状态不变（移动弱网不闪断），
  宽限期结束仍无连接才真正下线（写 blog `online=false` + 广播离线）。
- 管理员用户来源接口（`/users/all`、`/users/sorted`）返回的 `isOnline` 以 chat-server 内存态为准，并附 **`lastSeenAt`**（epoch ms，最后活跃时间）——收件箱离线时展示「最后在线 N分钟前」。

## App 端已知约定（勿破坏）

1. `publicHistory` / 私信 REST 的消息体字段大小写不同：公共房间 snake_case、私信 camelCase（历史遗留，两端均已适配）。
2. `authenticateUser` 中间件会对**每个请求**查博客用户（现已加 60s 缓存）；若博客内部 API 长时间不可用，聊天鉴权会随之失败。
3. 服务端断连（心跳超时/网络切换）对 App 是常规事件：App 会自动重连并重拉历史，服务端无需特殊处理；但**不要**在断连时下发需登录态才能处理的紧急逻辑。

## 数据库

- PostgreSQL 位于 **blog 服务器本机**（`DB_HOST=127.0.0.1`，库/角色同名 `chat_db`）。
- **schema 唯一事实来源 = 仓库根 `init.sql`**：改表结构必须同步更新它；新库执行 `psql -U chat_db -d chat_db -f init.sql`（幂等）。
- 消息表 `messages`：`conversation_id` = `conv_{sender}_{receiver}`，`role` user/assistant 决定方向；
  **`is_read`（boolean NOT NULL DEFAULT false）** 表示接收方已读，供已读回执/收件箱未读使用。
- `postgresService` 的关键读查询走 `queryWithRetry`（连接类错误自动重试最多 3 次），池开启 `keepAlive`。
- 若再出现 `Connection terminated unexpectedly` / `connection timeout` 刷屏，先确认 `DB_HOST` 是否被改回外部地址。
