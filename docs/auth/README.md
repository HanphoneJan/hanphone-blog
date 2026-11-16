# 长期登录（access + refresh 会话）

> 适用：Web（Next.js）、Android、Windows（Tauri）。
> 代码位置：`server/.../web/AuthController.java`、`service/AuthSessionService*`、`po/UserSession.java`；
> Web 侧 `web/src/lib/authApi.ts` + `web/src/app/next-api/auth/*`；Android 侧 `data/auth/TokenRefresher.kt`。

## 1. 模型

| 令牌 | 形态 | 时长 | 存放 |
|---|---|---|---|
| access | JWT（HS256） | **30 分钟**（`JWT_EXPIRE_TIME=1800000`） | 客户端内存/localStorage；请求头 `Token` 或 `Authorization: Bearer` |
| refresh | 32 字节随机串（base64url） | **90 天** | Web：HttpOnly Cookie（`hp_rt`）；Android：DataStore；Tauri：localStorage |

access claims：`userId`、`userType`、`pwdv`（密码版本）、`sid`（会话 id）、`iss`、`exp`。

会话表 `t_user_session`：一行 = 一次登录（`sid`），只存 `refresh` 的 SHA-256；
`prev_hash` 保存上一枚，用于识别「旧令牌被重放」。

## 2. 接口

前缀 `/api`（Web 的 BFF 在前，见第 4 节）。

### POST /auth/login（原有接口扩展）
请求不变。响应在 `user/token/expire` 之外新增 `refreshToken`、`refreshExpire`、`sid`。

### POST /auth/refresh
```json
{ "refreshToken": "<opaque>" }
```
成功：`{ token, expire, refreshToken, refreshExpire, sid }`（refresh 已轮换）。
失败 401，`data.code` 为：
- `REFRESH_INVALID` — 不存在/过期
- `SESSION_REVOKED` — 会话已吊销（含登出、改密）
- `REFRESH_REUSED` — **旧令牌被重放**，会话已被强制吊销，需要重新登录

### POST /auth/logout
Header `Token`（或 Bearer）+ body `{ "refreshToken": "..." }`（任一即可）→ 吊销当前会话。

### GET /auth/sessions · DELETE /auth/sessions/{sid}
需要 access。列表字段：`sid, deviceName, userAgent, ip, createdAt, lastUsedAt, expiresAt, active, revoked, revokedReason, current`。
只能操作自己的会话。

### POST /auth/adopt
需要 access（把一枚仍然有效的 access 换成正式会话）。OAuth 回调用它补建 refresh，
避免把 refresh token 放进 URL。

## 3. 安全规则

1. **轮换**：每次 refresh 生成新串，旧的写进 `prev_hash`。
2. **重放检测**：命中 `prev_hash` → 吊销整个 `sid`（`revokedReason=refresh_reused`），返回 `REFRESH_REUSED`。
   ⚠️ 实现注意：吊销后要抛异常，`refresh()` 标注了 `noRollbackFor = RefreshException`，否则吊销会被事务回滚。
3. **改密码**：`password_version + 1` + 吊销该用户全部会话（用户自己改密码时保留当前 `sid`）。
   `TokenInterceptor` 校验 `pwdv`，所以旧 access 立即 401（缓存 5 分钟，改密时主动 evict）。
4. **限流**：`/auth/refresh` 走 `PublicWriteRateLimitFilter`（10 次/分/IP）。
5. **日志**：会话创建/吊销/重放检测都打 info/warn 日志（含 sid、userId、ip）。

## 4. 客户端

### Web（BFF + HttpOnly Cookie）
- `/next-api/auth/login|register|refresh|logout|adopt|sessions` 六个 Route Handler 代理到后端。
- refresh token 只进 Cookie（`Path=/next-api/auth`，`HttpOnly`，`SameSite=Lax`），**不进响应体**。
- `lib/utils.ts` 的 axios 拦截器：401 → `refreshAccessToken()`（单飞）→ 重放一次；失败才清凭证。
- 页面：`/sessions`（登录设备），入口在头像菜单「登录设备」。

### Android
- `TokenStore.refreshToken` + DataStore（`auth_refresh_token`）。
- `TokenRefresher`：`Mutex` 单飞，401 拦截器用 `runBlocking` 调用并重放一次；`/auth/*`、`/login`、`/chat-api/` 不触发。
- 启动：`Jwt.isExpired(token, 120)` → 先 `refresh`，失败才回未登录。
- 退出登录调用 `/auth/logout` 吊销会话。

### Tauri（静态导出）
没有 Node 路由 → 构建时注入 `NEXT_PUBLIC_AUTH_DIRECT=1`（见 `web/scripts/build-tauri.mjs`），
直连后端、refresh 存 localStorage。Web 与 Tauri 共用 `lib/authApi.ts` 的两条分支。

## 5. 部署与灰度

1. 后端先上（新表 `t_user_session` + `t_user.password_version` 由 `ddl-auto=update` 自动加，纯增量）。
2. Web 上线（刷新逻辑先于 TTL 收紧）。
3. Android 发新版。
4. 最后把 `JWT_EXPIRE_TIME` 收到 `1800000`；未升级的老客户端会因 30 分钟过期而频繁重登，属预期。

回滚：把 `JWT_EXPIRE_TIME` 调回 `604800000` 即可；新接口保留不影响老逻辑（老 token 没有 `sid`/`pwdv`，
拦截器对缺失 claim 的 token 放行到过期）。

## 6. 常见问题

- **并发 401 触发多次刷新**：必须单飞（Web `inflight` Promise / Android `Mutex`），否则轮换会互相作废并触发重放告警。
- **Cookie 不生效**：BFF 与页面必须同源；`Path=/next-api/auth` 限制作用域；跨站（`www` vs 裸域）时要注意 Host-only cookie 不共享。
- **改密码后自己被登出**：`onPasswordChanged(userId, keepSid)` 会保留当前 sid；老客户端不带 `sid`，会被全端踢下线。
- **chat-server / admin-file 无需改动**：它们只验 access 的签名与过期时间。
