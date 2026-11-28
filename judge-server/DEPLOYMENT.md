# 部署预案

当前只做本机开发，**尚未改生产服务器**。这里记录两条路径，等确认后再执行。

## 本机（现在）

```bash
GO_JUDGE_IMAGE=docker.1ms.run/criyle/go-judge:latest \
  docker compose -f docker-compose.dev.yml up -d
pnpm install && pnpm migrate && pnpm run import:problems && pnpm dev
```

go-judge 容器 `--privileged`，只绑 `127.0.0.1:5050`；judge 专用 PostgreSQL 在 `127.0.0.1:5433`。不要暴露到公网。

## 生产：现有博客服务器（Python-only 可行）

服务器：2 vCPU / 1.9GB，Debian 13，cgroup v2，已有 Python 3.13、PostgreSQL 17、nginx。需要 sudo 安装 go-judge。

1. 安装 `python3-numpy`（ML23 的 k-Means 需要），下载 go-judge release 二进制到 `/home/hanphone/judge/bin/go-judge`，校验 sha256。
2. 建 `/etc/systemd/system/go-judge.service`：

```ini
[Unit]
Description=go-judge sandbox
After=network.target

[Service]
Type=simple
ExecStart=/home/hanphone/judge/bin/go-judge \
  -http-addr 127.0.0.1:5050 \
  -auth-token <RANDOM_TOKEN> \
  -parallelism 1 \
  -no-fallback \
  -output-limit 1048576 \
  -copy-out-limit 1048576 \
  -file-timeout 10m \
  -dir /home/hanphone/judge/files
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

3. `judge-server` 用 systemd 以 `hanphone` 运行，`WorkingDirectory=/home/hanphone/server_judge`，`MemoryMax=384M`。
4. PostgreSQL 建 `judge` 库/用户，执行 `sql/schema.sql`。
5. nginx 在 `hanphone.cn` 的 server 块加：

```nginx
location /judge-api/ {
  proxy_pass http://127.0.0.1:5051/;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header Host $host;
  client_max_body_size 128k;
  proxy_read_timeout 30s;
}
```

6. Cloudflare 对 `/judge-api/*` 绕缓存；若 POST 被挑战，改用 DNS-only 的 `judge.hanphone.cn` + 证书。
7. CORS 只放 `https://docs.hanphone.cn` 和本地 3001（`.env` 的 `ALLOWED_ORIGINS`）。

内存预估：Node ~60MB + go-judge ~30MB + 单次 Python ~30-80MB。并发 1 时 466MB 可用内存可跑，但要监控 swap/OOM。

## 生产：独立 2C4G VPS（后续加 C/Java/更高并发）

- 同样的 systemd 单元；go-judge 与 judge-server 都放在 VPS；
- 域名 `judge.hanphone.cn`，CORS 指向文档站；
- 博客服务器只保留 nginx 反代或直接由文档站跨域调用；
- 测试数据与提交库独立，不碰博客库。

## 上线前检查

- [ ] `pnpm test`、`pnpm smoke` 通过
- [ ] `-no-fallback` 下 go-judge 启动成功（cgroup 真的生效）
- [ ] 网络/文件/fork/输出/TLE/MLE 隔离 smoke 通过
- [ ] CORS 预检 204，Origin 只回允许值
- [ ] 429 限额、队列满、重启中断都有可读错误
- [ ] 文档站 `pnpm build` 通过，页面在服务端不可用时仍能正常阅读
