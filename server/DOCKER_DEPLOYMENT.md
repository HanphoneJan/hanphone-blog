# Docker 部署（后端）

用 Docker Compose 起 **PostgreSQL + Redis + Spring Boot**。本机生产环境实际使用 Systemd 原生部署（见
[DEPLOYMENT.md](./DEPLOYMENT.md)），两者二选一，不要同时跑。

配置文件：`docker-compose.yml`（服务与网络）、`Dockerfile`（多阶段构建）、`env.example`（变量模板）。

## 组成

| 服务 | 镜像 | 端口 | 说明 |
| --- | --- | --- | --- |
| `postgres` | postgres:14-alpine | 5432 | 数据卷 `postgres_data` |
| `redis` | redis:7-alpine | 6379 | 带密码，数据卷 `redis_data` |
| `blog` | 本地构建 | 8090 | 依赖前两者健康后启动，挂载 `./logs` |

## 快速部署

```bash
cd server
cp env.example .env
# 必改：TOKEN_SECRET、PG_PASSWORD、REDIS_PASSWORD、EMAIL_*
# 可选：SPRING_PROFILES_ACTIVE（默认 prod）；端口在 docker-compose.yml 里改

docker compose up -d --build
docker compose ps
curl -f http://127.0.0.1:8090/actuator/health
```

`compose` 会把 `PG_HOST` / `REDIS_HOST` 指到服务名，`.env` 里不需要写 localhost。
数据在命名卷里，`docker compose down` 不会丢；要清空加 `-v`（慎用）。

## Nginx 反向代理

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20m;
}
```

HTTPS 用 `certbot --nginx -d hanphone.cn` 即可，证书续期由 certbot 的 timer 负责。

## 常用命令

```bash
docker compose logs -f blog          # 看应用日志
docker compose restart blog          # 重启应用
docker compose exec postgres psql -U bloguser -d blog
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"

# 备份 / 恢复
docker compose exec -T postgres pg_dump -U bloguser blog > backup-$(date +%F).sql
cat backup-2026-01-01.sql | docker compose exec -T postgres psql -U bloguser -d blog
```

## 调优（2C2G 必看）

- **JVM**：`Dockerfile` 默认 `-Xms2048m -Xmx2048m`，在 2G 机器上会把容器和系统一起拖垮。
  部署到小机器时改成 `-Xms256m -Xmx768m`，并给容器加 `mem_limit`（如 `1g`）。
- **PostgreSQL**：`shared_buffers=256MB`、`work_mem=8MB` 足够个人博客。
- **Redis**：`maxmemory 256mb` + `maxmemory-policy allkeys-lru`（缓存允许丢）。
- 日志：给 Docker 配置 `max-size=10m`、`max-file=3`，避免日志撑满磁盘。

## 排障

| 现象 | 排查 |
| --- | --- |
| 容器起不来 | `docker compose logs blog`；确认 `.env` 存在且变量无拼写错误 |
| 数据库连接失败 | `docker compose ps` 看 postgres 是否 healthy；密码与 `PG_PASSWORD` 一致 |
| Redis 认证失败 | `REDIS_PASSWORD` 与 compose 启动参数一致 |
| 健康检查失败 | `curl -f localhost:8090/actuator/health`；首次启动有 40s `start_period` |
| 端口被占用 | `ss -ltnp \| grep 8090`；改 `docker-compose.yml` 的端口映射，或停掉旧进程 |

## 安全

- 修改所有默认密码；`TOKEN_SECRET` 用随机长字符串。
- 5432 / 6379 不要暴露到公网（防火墙只放 80/443，或用 `127.0.0.1:5432:5432` 绑定本机）。
- 容器内已用非 root 用户运行应用（见 `Dockerfile`）。
