# 登录与会话（access + refresh · 第三方登录）

> 适用：Web（Next.js）、Android、Windows（Tauri）。
> 代码位置：`server/.../web/AuthController.java`、`web/OAuthController.java`、`service/AuthSessionService*`、`service/OAuthExchangeCodeStore.java`、`po/UserSession.java`、`service/impl/{Github,Google}OAuthProvider.java`；
> Web 侧 `web/src/lib/authApi.ts` + `web/src/app/next-api/auth/*` + `web/src/components/LoginForm.tsx`；Android 侧 `data/auth/{TokenRefresher,OAuthLogin}.kt`。

## 1. 模型

| 令牌 | 形态 | 时长 | 存放 |
|---|---|---|---|
| access | JWT（HS256） | **30 分钟**（`JWT_EXPIRE_TIME=1800000`） | 客户端内存/localStorage；请求头 `Token` 或 `Authorization: Bearer` |
| refresh | 32 字节随机串（base64url） | **90 天** | Web：HttpOnly Cookie（`hp_rt`）；Android：DataStore；Tauri：localStorage |

access claims：`userId`、`userType`、`pwdv`（密码版本）、`sid`（会话 id）、`iss`、`exp`。

会话表 `t_user_session`：一行 = 一次登录（`sid`），只存 `refresh` 的 SHA-256；
`prev_hash` 保存上一枚，用于识别「旧令牌被重放」。

## 2. 密码登录与会话接口

前缀 `/api`（Web 的 BFF 在前，见第 5 节）。

### POST /login
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
需要 access（把一枚仍然有效的 access 换成正式会话）。网页 OAuth 回调用它补建 refresh，
避免把 refresh token 放进 URL。

## 3. 第三方登录（GitHub / Google）

两条回跳路径，由授权 URL 上的 `state` 区分（第三方原样回传，不需要在第三方后台注册）：

| 入口 | 授权地址 | 回跳 | 谁换会话 |
|---|---|---|---|
| 网页 GitHub | `/api/oauth/github/authorize`（无 state） | `FRONTEND_URL/oauth/callback?token=…&userInfo=…` | 页面 → `POST /next-api/auth/adopt`（refresh 进 Cookie） |
| 网页 Google | 浏览器 GSI 拿 ID Token → `POST /api/oauth/google/verify` | 不跳转，直接返回会话 | 同一响应 |
| App（Android） | `/api/oauth/{github,google}/authorize?state=app` | `https://hanphone.cn/api/oauth/app/return?code=…` → `hanphone://oauth/callback?code=…` | App → `POST /api/oauth/app/exchange {code}` |

App 流程：

1. 登录页「GitHub 登录 / Google 登录」用系统浏览器打开授权地址（GitHub 授权页禁止被内嵌，WebView 也不共享登录态）；
2. 服务端 `callback` 认出 `state=app`，用 `AuthSessionService.create` 建**完整会话**，把
   `{user, 会话}` 塞进 `OAuthExchangeCodeStore`，再 302 到 **https 中转页**
   `GET /oauth/app/return?code=…`（一次性 32 字节 code）；
3. 若 **App Links** 已校验通过，第 2 步的 https URL 由系统直接交给 App（跳过本步）；否则浏览器打开中转页：
   自动尝试 `location.replace('hanphone://oauth/callback?code=…')`，同时给一个「打开云林有风」按钮。
   **为什么不直接 302 到 `hanphone://`**：国内浏览器（实测夸克）对非用户手势的外部 scheme 跳转会**静默忽略**，
   用户停在白页以为登录失败；页面内用户点击才会放行（最多弹一次「是否打开外部应用」）；
4. App 回到前台，`POST /oauth/app/exchange` 兑换，响应结构与 `/login` **完全一致**
   （`user` + `token` + `refreshToken` + …），因此与密码登录共用同一套落盘逻辑；
5. 兑换码一次有效、2 分钟过期、进程内存储（单实例）。

为什么不像网页那样把 token 拼在回跳 URL：自定义 scheme（`hanphone://`）不是系统独占的，
任何 App 都能注册同名 scheme，URL 里的凭证可能被别的应用抢到。一次性 code 把风险压到最小。

> 更顺滑的方案是 **Android App Links**：App 已注册
> `https://hanphone.cn/api/oauth/app/*`（`autoVerify`），校验通过后系统把中转页 URL **直接交给 App**，
> 浏览器根本不参与；未通过校验时退回上面的中转页，不报错。
>
> - 校验文件：`web/public/.well-known/assetlinks.json`，`package_name=com.hanphone.blog`，
>   `sha256_cert_fingerprints` 必须与**实际签名证书**一致。当前 App 的 release 也用 debug 密钥签名
>   （`android/app/build.gradle.kts` 的 `signingConfig = debug`，自分发阶段），所以指纹取自
>   `~/.android/debug.keystore`；**S5 换成正式签名后必须同步改这里**，否则 App Links 静默失效（只退回浏览器中转页）。
> - **nginx 的落点不是 `public/`**：`/etc/nginx/conf.d/hanphone.cn.conf` 里
>   `location /.well-known/ { root /home/hanphone/client_blog; }`，所以文件必须在
>   `~/client_blog/.well-known/assetlinks.json`。每次 web 部署后补一条：
>   `ssh blog 'mkdir -p ~/client_blog/.well-known && cp ~/client_blog/public/.well-known/assetlinks.json ~/client_blog/.well-known/'`。
>   验证：`curl -s https://hanphone.cn/.well-known/assetlinks.json`（必须是 `application/json`、无跳转）。
> - 校验状态：`adb shell pm get-app-links com.hanphone.blog`；改完 assetlinks 或重装后用
>   `adb shell pm verify-app-links --re-verify com.hanphone.blog` 重新校验。
>   部分国产 ROM（HyperOS/MIUI 实测）即使校验通过，用户选择仍是「禁止」，
>   需要用户在「应用信息 → 打开支持的链接」里放开，或 `adb shell pm set-app-links-user-selection
>   --user 0 --package com.hanphone.blog true hanphone.cn`。
> - 路径注意：中转页在 `/api/oauth/app/return`（nginx 只把 `/api` 转给后端），Manifest 的
>   `pathPrefix` 与 `OAuthLogin.isCallback` 都按 `/api/oauth/app/` 匹配。

账号规则（`GithubOAuthProvider.matchOrCreateUser` / `GoogleOAuthProvider.matchOrCreateUser`）：

- 首次用第三方登录 → 自动建号，`username = gh_<id>` / `goog_<id>`，**没有密码**；
- 第三方返回的邮箱与已有账号一致 → 直接绑定到那个账号（不新建）；
- 已登录用户绑定/解绑：`POST /user/bind/oauth`、`POST /user/unbind/oauth`（仅网页）。

配置：`GITHUB_CLIENT_ID/SECRET/REDIRECT_URI`、`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`，
客户端回跳为 `APP_OAUTH_REDIRECT`（默认 `hanphone://oauth/callback`，须与 App Manifest 一致），
中转页为 `APP_OAUTH_RETURN_URL`（留空时取 `FRONTEND_URL/api/oauth/app/return`，必须 https 可达）。
新增 provider 只需实现 `OAuthProvider`，`authorize`/`callback` 通配路由与 App 流程自动可用。

Google 的两个额外约束：

- **服务器必须能出站到 Google**（`oauth2.googleapis.com`）：换 code、拉 userinfo、校验 ID Token 都靠它。
  国内服务器直连不通（curl 返回 000），走 `GOOGLE_OAUTH_PROXY_HOST/PORT`；两者留空时**回退到 `HOT_PROXY`**
  （同一台机器上的 mihomo，如 `http://127.0.0.1:7890`）。
- **`POST /oauth/google/verify`（网页 GSI 的 ID Token）现在由 Google 的 tokeninfo 端点验签**，
  并核对 `aud == GOOGLE_CLIENT_ID`。旧实现只 `JWT.decode`（不验签、不校验受众），
  任何人拼一个 payload 就能以任意 `sub`/`email` 登录，且会被「邮箱合并」逻辑绑到已有账号——
  等于公开的账号接管入口，务必保留现在的校验。

## 4. 安全规则

1. **轮换**：每次 refresh 生成新串，旧的写进 `prev_hash`。
2. **重放检测**：命中 `prev_hash` → 吊销整个 `sid`（`revokedReason=refresh_reused`），返回 `REFRESH_REUSED`。
   ⚠️ 实现注意：吊销后要抛异常，`refresh()` 标注了 `noRollbackFor = RefreshException`，否则吊销会被事务回滚。
3. **改密码**：`password_version + 1` + 吊销该用户全部会话（用户自己改密码时保留当前 `sid`）。
   `TokenInterceptor` 校验 `pwdv`，所以旧 access 立即 401（缓存 5 分钟，改密时主动 evict）。
   ⚠️ 管理端更新用户（`UserServiceImpl.updateUser`，`POST /admin/user`、`/admin/setAvatar`）必须排除
   `passwordVersion` 与 `isOnline` 再 `copyProperties`：`passwordVersion` 是 `@JsonIgnore`（客户端拿不到，
   反序列化默认 0），复制会把密码版本归零，等于让改密前签发的旧 access 复活；`isOnline` 默认 false，编辑资料会把人显示成离线。
4. **限流**：`/auth/refresh` 走 `PublicWriteRateLimitFilter`（10 次/分/IP）。
5. **日志**：会话创建/吊销/重放检测都打 info/warn 日志（含 sid、userId、ip）。
6. **OAuth 的 `state` 白名单**：只接受空或 `app`，其他值直接 400 —— 避免 `/oauth/{provider}/authorize` 被当成任意跳转。
7. **App 兑换码**：32 字节随机、单次消费、2 分钟过期；兑换接口响应与登录一致，但**不返回任何第三方凭证**。

## 5. 客户端

### Web（BFF + HttpOnly Cookie）
- `/next-api/auth/login|register|refresh|logout|adopt|sessions` 六个 Route Handler 代理到后端。
- refresh token 只进 Cookie（`Path=/next-api/auth`，`HttpOnly`，`SameSite=Lax`），**不进响应体**。
- `lib/utils.ts` 的 axios 拦截器：401 → `refreshAccessToken()`（单飞）→ 重放一次；失败才清凭证。
- 页面：`/sessions`（登录设备），入口在头像菜单「登录设备」；登录页有 GitHub 按钮与 Google One Tap / 按钮。

### Android
- `TokenStore.refreshToken` + DataStore（`auth_refresh_token`）。
- `TokenRefresher`：`Mutex` 单飞，401 拦截器用 `runBlocking` 调用并重放一次；`/auth/*`、`/login`、`/oauth/*`、`/chat-api/` 不触发。
- 启动：`Jwt.isExpired(token, 120)` → 先 `refresh`，失败才回未登录。
- 退出登录调用 `/auth/logout` 吊销会话。
- 登录入口：用户名 + 密码；「使用 GitHub 登录」→ `data/auth/OAuthLogin.kt`（系统浏览器 → `hanphone://` 回跳 → `POST /oauth/app/exchange` → `core/LoginSession.applyLogin`）。
  三个登录入口（登录/注册/第三方）都走 `applyLogin`，字段一致，别再各写一份。

### Tauri（静态导出）
没有 Node 路由 → 构建时注入 `NEXT_PUBLIC_AUTH_DIRECT=1`（见 `web/scripts/build-tauri.mjs`），
直连后端、refresh 存 localStorage。Web 与 Tauri 共用 `lib/authApi.ts` 的两条分支。
Tauri 走网页流程（`state` 为空）；若要接客户端流程，同样用 `state=app` + `APP_OAUTH_REDIRECT`。

## 6. 部署与灰度

1. 后端先上（新表 `t_user_session` + `t_user.password_version` 由 `ddl-auto=update` 自动加，纯增量）。
2. Web 上线（刷新逻辑先于 TTL 收紧）。
3. Android 发新版（第三方登录依赖新版 Manifest 的 `hanphone://oauth` intent-filter）。
4. 最后把 `JWT_EXPIRE_TIME` 收到 `1800000`；未升级的老客户端会因 30 分钟过期而频繁重登，属预期。

回滚：把 `JWT_EXPIRE_TIME` 调回 `604800000` 即可；新接口保留不影响老逻辑（老 token 没有 `sid`/`pwdv`，
拦截器对缺失 claim 的 token 放行到过期）。第三方登录回滚只需撤下 App 的按钮，服务端接口留着无害。

## 7. 常见问题

- **并发 401 触发多次刷新**：必须单飞（Web `inflight` Promise / Android `Mutex`），否则轮换会互相作废并触发重放告警。
- **Cookie 不生效**：BFF 与页面必须同源；`Path=/next-api/auth` 限制作用域；跨站（`www` vs 裸域）时要注意 Host-only cookie 不共享。
- **改密码后自己被登出**：`onPasswordChanged(userId, keepSid)` 会保留当前 sid；老客户端不带 `sid`，会被全端踢下线。
- **第三方注册的账号在 App 里密码登录失败**：自动建号没有密码（`BcryptUtils.verify` 直接 false），这不是 bug；
  用同一个第三方登录，或先在网页「忘记密码」用邮箱设一个密码。
- **App 授权后停在浏览器/没反应**：先确认默认浏览器是否忽略了 302 → `hanphone://`（夸克实测会静默忽略）。
  服务端因此先落 https 中转页 `GET /api/oauth/app/return`，页面会自动尝试跳转并给出按钮；
  用户点按钮时浏览器可能再问一次「是否打开外部应用」。页面本身打不开就检查
  `APP_OAUTH_RETURN_URL`（留空取 `FRONTEND_URL/api/oauth/app/return`）与 `FRONTEND_URL`。
  兑换码 2 分钟过期，超时重新点登录即可。
- **chat-server / admin-file 无需改动**：它们只验 access 的签名与过期时间。
