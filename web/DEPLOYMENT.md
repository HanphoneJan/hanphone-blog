# 前端（Next.js）生产部署手册与故障复盘

本文档覆盖 `web/`（Next.js 前端）的生产部署流程与一次由**构建时环境变量缺失**引发的全站 API 请求失败事故的复盘。文中不包含任何服务器地址、口令与密钥，部署机相关细节一律以 `<占位符>` 表示。

---

## 1. 部署架构要点

- 前端为客户端渲染（CSR）与服务端渲染（SSR）混合的 Next.js 应用，生产通过 `next start` 运行。
- 浏览器端与服务端（SSR）的 API 请求地址都来自 **`web/src/lib/api.ts` 的 `API_BASE_URL`**，该值在**构建时**由 `NEXT_PUBLIC_API_BASE_URL` 注入，会**编译进产物**（客户端 JS 与服务端 JS）。
- 对外 API 统一走 `https://<站点>/api/...` 路径，由反向代理把 `/api` 前缀转发到后端；**后端自身是根路径、不感知 `/api` 前缀**。
- 因此**构建时漏注入 `NEXT_PUBLIC_API_BASE_URL`，会把代码默认值 `http://localhost:8090/api` 编进线上产物**（该默认值仅适用于本地开发），浏览器端与 SSR 端会同时失效（机制见 §3.4）。

> ⚠️ 所有 `NEXT_PUBLIC_*` 变量都必须在**构建机**上正确注入；`next build` 会在构建期将它们内联进产物。**运行时的进程重启不能改变已编译进产物的值。**

---

## 2. 生产部署流程（标准操作）

### 2.0 环境变量

`.env` 文件不进仓库，生产部署目录中保存一份权威副本。**每次发版前以部署目录中的 `.env` 为准**下载到 `web/.env`：

```bash
scp <部署主机>:<部署目录>/.env web/.env
```

校验关键变量：

```bash
grep -E "NEXT_PUBLIC_API_BASE_URL|NEXT_PUBLIC_NEXT_API_BASE_URL|NEXT_PUBLIC_PICTURE_BASE_URL" web/.env
```

必含（以实际生产域名为准）：

```
NEXT_PUBLIC_API_BASE_URL=https://<站点>/api
NEXT_PUBLIC_NEXT_API_BASE_URL=https://<站点>/next-api
NEXT_PUBLIC_PICTURE_BASE_URL=https://<文件服务域名>
```

### 2.1 构建

```bash
pnpm --filter web build
```

### 2.2 构建后强制校验（关键步骤，防止"坏包上线"）

构建完成后，在产物里确认环境变量真的编进去了：

```bash
cd web
# 1) 客户端静态产物不得出现本地开发默认值
grep -rl "localhost:8090" .next/static/ 2>/dev/null | grep -v "\.map$" || true   # 应无输出
# 2) 生产 API 基址应被编入
grep -rl "https://<站点>/api" .next/static/chunks/ | wc -l                     # 应 > 0
# 3) 运行时 JS 全量检查（排除 sourcemap 与构建缓存）
grep -rl "localhost:8090" .next/ 2>/dev/null | grep -vE "\.map$|/cache/" | head || true  # 应无输出
```

预期：运行时 JS 均不含 `http://localhost:8090/api`；否则**不要上传**，回到 §2.0 检查 `.env`。

### 2.3 打包

```bash
cd web
# .next 排除缓存目录（历史/开发构建缓存可达数 GB，不属于生产运行时）
tar -cf /tmp/web-next.tar --exclude='.next/cache' .next
tar -cf /tmp/web-public.tar public
```

### 2.4 上传与替换

```bash
# 1) 备份现有目录（务必先备份，便于回滚）
ssh <部署主机> "cd <部署目录> && cp -a .next .next.bak_$(date +%Y%m%d-%H%M) && cp -a public public.bak_$(date +%Y%m%d-%H%M)"

# 2) 上传
scp /tmp/web-next.tar /tmp/web-public.tar <部署主机>:<部署目录>/

# 3) 替换（先删旧目录再解压，避免旧 chunk 残留被清单引用）
ssh <部署主机> "cd <部署目录> && rm -rf .next public && tar -xf web-next.tar -C . && tar -xf web-public.tar -C . && rm -f web-next.tar web-public.tar"
```

> 说明：`next build` 产物 chunk 名带内容哈希，替换时**必须整体删除旧 `.next` 再解压**。

### 2.5 重启与验证

```bash
ssh <部署主机> "cd <部署目录> && pm2 restart <前端进程名>"
```

上线验证（从公网）：

```bash
# 1) 首页 SSR 数据已渲染（统计数字来自后端，证明 SSR 链路打通）
curl -sS https://<站点>/ | grep -oE "blogCount[^,]*" | head -3
# 2) 客户端产物基址
CH=$(curl -sS https://<站点>/ | grep -oE 'src="/_next/static/chunks/[^"]+\.js' | head -1 | sed 's/src="//;s/"$//')
curl -sS "https://<站点>$CH" | grep -c "localhost:8090"    # 应为 0
# 3) 后端接口直连
curl -sS -o /dev/null -w "%{http_code}\n" https://<站点>/api/site-stats   # 应为 200
# 4) 进程日志无新 404
ssh <部署主机> "tail -20 ~/.pm2/logs/<前端进程名>-error.log"
```

---

## 3. 事故复盘（构建漏注入 API 基址，全站数据挂掉）

### 3.1 现象

- 站点"突然无法获取到 API 数据"：首页文章/统计/随笔/留言等全部为空。
- 出现时间：某次前端发版后立即出现。

### 3.2 排查思路（先查线上、再查代码）

1. **先确认后端健康**，直接请求线上 API，排除后端故障：
   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" https://<站点>/api/site-stats   # 200 即后端正常
   ```
   后端全 200，问题大概率在前端链路。

2. **检查线上客户端产物**：拉取首页 HTML 引用的 JS chunk，检索 API 基址是否被编成默认值：
   ```bash
   # 出现 http://localhost:8090/api 即命中"产物编错基址"
   curl -sS https://<站点>/_next/static/chunks/<chunk>.js \
     | grep -oE "https://<站点>/api|http://localhost:8090/api" | sort | uniq -c
   ```
   同时对比问题文件的 `Last-Modified`，若恰好等于某次发版时间，即为该次发版引入。

3. **看服务端（SSR）日志**：若出现大量 `Failed to fetch xxx: Error: HTTP error! status: 404`，说明 SSR 抓到了后端不存在的路径（详见 §3.4）。

4. **核对反向代理与后端 context-path**（本次事故的关键盲区）：
   - 反向代理对外暴露 `/api/...`，转发到后端时**剥离 `/api` 前缀**；
   - 后端监听在本机端口，提供的是**根路径**接口；
   - 因此"外部经 `/api` 能通"完全由反向代理保证；任何绕过代理直达后端的请求（如服务器本机 SSR 直连 `http://localhost:<后端端口>/api/...`）都会 **404**。

### 3.3 根因

本次发版构建机未注入 `NEXT_PUBLIC_API_BASE_URL`，`api.ts` 的默认回退值 `http://localhost:8090/api` 被编译进客户端与服务端全部产物：

- **浏览器端**：HTTPS 页面请求 `http://localhost:8090/api/...`，触发浏览器混合内容（Mixed Content）拦截 / 访问访客本机端口 → 全部失败；
- **SSR 端**：Next 服务在部署主机上直连 `http://localhost:<后端端口>/api/...`，而后端是根路径、`/api` 前缀只由代理剥离 → 全部 **404**（与进程日志吻合）。

后端、数据库、反向代理均正常，故障完全由「构建期环境变量缺失」造成。

### 3.4 修复动作（按 §2 标准流程）

1. 从部署目录下载权威 `.env` 到 `web/.env`；
2. `pnpm --filter web build`；
3. §2.2 校验：产物无 `localhost:8090`、生产基址正常编入；
4. 备份旧目录 → 上传 `.next`（排除 cache）与 `public` → 删除旧目录后解压替换；
5. 重启前端进程；
6. 验证：SSR HTML 已渲染真实统计、客户端 chunk 基址正确、进程日志无新 404。

---

## 4. 经验与预防

1. **构建后必做产物校验**（§2.2），把"URL 是否被编入"纳入发版检查清单。
2. **`.env` 不进仓库**导致构建机差异难以察觉，建议：
   - CI/CD 为 web 构建注入全部 `NEXT_PUBLIC_*`（作为工程变量）；
   - 或本地构建脚本启动前校验 `web/.env` 含必填变量，缺失即失败。
3. **上线冒烟**：至少验证「首页 SSR 数据」「一个客户端请求」「一个后端 `/api` 接口」。
4. **排查顺序**：先线上（后端 → 产物 → SSR 日志 → 代理）后代码，避免被仓库内看似合理的默认值误导。
5. **部署目录备份**：替换 `.next`/`public` 前先备份；确认新版正常后再清理旧包与备份，防止不可回滚。
6. **公开仓库注意脱敏**：运维文档避免写真实服务器地址、端口、进程名与代理配置，统一使用占位符。

---

## 5. 附：关键配置备忘（全部使用占位符，不含隐私）

| 项 | 说明 |
| --- | --- |
| 前端运行 | `next start`（进程管理，工作目录为部署目录） |
| 前端端口 | `<next-port>`（内部监听） |
| 后端 | Spring Boot，监听本机端口，API 为根路径（无 `/api` 前缀） |
| 反向代理 | 对外暴露 `/api/...`，转发到后端时剥离 `/api` 前缀 |
| 构建注入变量 | `NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_NEXT_API_BASE_URL`、`NEXT_PUBLIC_PICTURE_BASE_URL`、`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_FILE_DOMAIN` 等 |
| 代码默认值 | `web/src/lib/api.ts`：`http://localhost:8090/api`（仅本地开发） |