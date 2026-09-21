# 后端部署指南

本文档介绍 Hanphone's Blog 后端的两种生产部署方式：

| 方式 | 适用场景 | 说明 |
| ---- | -------- | ---- |
| [方式一：Systemd 原生部署](#方式一systemd-原生部署当前使用) | 已有主机 + JDK，轻量 | **当前生产使用**，直接托管 jar |
| [方式二：Docker Compose](#方式二docker-compose-部署) | 需要一键拉起依赖 | 连同 PostgreSQL / Redis 一起容器化 |

---

## 通用前置

- JDK 17+（方式一）、Docker + Docker Compose（方式二）
- PostgreSQL 12+、Redis 5.0+
- 环境变量文件 `.env`（由 `env.example` 复制，完整字段见 [环境变量](#环境变量)）

## 构建产物

两种方式共用同一个 Spring Boot 可执行 fat jar：

```bash
cd server
mvn clean package
# 产物：target/blog-3.0.jar
```

---

## 方式一：Systemd 原生部署（当前使用）

### 1. 准备目录

```bash
mkdir -p /home/hanphone/server_blog/logs
# 将构建产物放到该目录
# /home/hanphone/server_blog/blog-3.0.jar
```

### 2. 配置环境变量

```bash
cp env.example .env
vim /home/hanphone/server_blog/.env
```

Systemd 原生支持加载 `.env` 文件，无需 `export` 前缀（与 [环境变量](#环境变量) 格式一致）。

### 3. 创建服务文件

```bash
sudo vim /etc/systemd/system/blog.service
```

```ini
[Unit]
Description=Blog Spring Boot Application
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/hanphone/server_blog
# 关键点：直接指定 .env 文件，Systemd 会自动解析并注入为环境变量
EnvironmentFile=/home/hanphone/server_blog/.env
ExecStart=/usr/bin/java -Xmx1024M -Xms256M -XX:+UseG1GC -jar /home/hanphone/server_blog/blog-3.0.jar
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/hanphone/server_blog/logs/out.log
StandardError=append:/home/hanphone/server_blog/logs/error.log

[Install]
WantedBy=multi-user.target
```

### 4. 启动并设置开机自启

```bash
sudo systemctl daemon-reload
sudo systemctl start blog
sudo systemctl enable blog
```

### 5. 升级（重新部署）

```bash
# 1. 上传新 jar 覆盖旧文件
scp target/blog-3.0.jar <user>@<server>:/home/hanphone/server_blog/blog-3.0.jar

# 2. 重启服务
sudo systemctl restart blog
```

### 6. 查看日志

```bash
sudo journalctl -u blog -f                      # 实时查看系统日志
tail -f /home/hanphone/server_blog/logs/out.log # 或看输出文件
```

---

### 7. 访客 IP 定位库自动更新

后端使用 **DB-IP City Lite** 离线库把访客 IP 解析成国家/省份。该库每月更新一次，可用 `scripts/update-dbip.sh` 配 cron 自动拉取覆盖并重启服务。

```bash
# 1. 把脚本放到服务器某目录（路径请用你自己的目录）
sudo mkdir -p <你的目录>/bin
sudo cp scripts/update-dbip.sh <你的目录>/bin/update-dbip.sh
sudo chmod +x <你的目录>/bin/update-dbip.sh

# 2. 立即手动执行一次验证（-s 为 systemd 服务名；不传 -p 则 mmdb 下载到脚本同目录）
sudo <你的目录>/bin/update-dbip.sh -s blog

# 3. 加入 crontab：每月 1 号凌晨 3 点自动更新
sudo crontab -e
# 添加一行（换成你的实际路径）：
# 0 3 1 * *  <你的目录>/bin/update-dbip.sh -s blog >> /var/log/update-dbip.log 2>&1
```

脚本会：下载 db-ip 官方当月 mmdb → 校验为有效 MaxMind DB 格式 → 覆盖目标文件（保留 `.bak` 备份）→ 重启 `-s` 指定的服务。不传 `-p` 时，mmdb 默认下载到脚本所在目录（`dbip-city-lite.mmdb`），然后你可把 `server/.env` 的 `GEO_DB_PATH` 指向该文件。

> 参数说明见脚本头部注释（`-p` 可选默认脚本目录，`-s` 可选，`-n` 预演不落库）。所有路径/服务名由调用方传入，脚本本身不包含任何部署信息。

## 方式二：Docker Compose 部署

Docker 方式会把 PostgreSQL、Redis、后端一起容器化，适合需要一键拉起完整依赖的场景。

### 1. 配置环境变量

```bash
cp env.example .env
# 编辑 .env（PG_PASSWORD / REDIS_PASSWORD / TOKEN_SECRET 等）
```

### 2. 启动

```bash
# 构建镜像并后台启动（PostgreSQL + Redis + 后端）
docker compose up -d

# 查看状态与日志
docker compose ps
docker compose logs -f blog
```

### 3. 升级（重新部署）

```bash
# 拉取代码后重建镜像并重启
docker compose up -d --build
```

### 4. 常用运维命令

```bash
docker compose restart blog          # 仅重启后端
docker compose down                  # 停止（保留数据卷）
docker compose exec blog bash        # 进入容器
docker stats                         # 查看资源占用
```

更完整的 Docker 说明（生产配置、备份恢复、监控）见 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)。

---

## 环境变量

`.env` 由 `env.example` 复制而来，关键字段：

| 变量                  | 说明                  | 必需 |
| --------------------- | --------------------- | ---- |
| `SPRING_PROFILES_ACTIVE` | 运行环境（prod/dev） | ✓   |
| `TOKEN_SECRET`        | JWT 签名密钥          | ✓   |
| `PG_HOST` / `PG_USERNAME` / `PG_PASSWORD` | 数据库连接 | ✓   |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 连接 | ✓   |
| `EMAIL_USERNAME` / `EMAIL_PASSWORD` / `EMAIL_HOST` | 邮件服务 | ✓   |
| `SERVER_PORT`         | 应用端口（默认 8090） |    |
| `CORS_ALLOWED_ORIGINS`| CORS 白名单（逗号分隔）|    |
| `INTERNAL_API_KEY`    | 内部服务通信密钥      |    |
| `GITHUB_*` / `GOOGLE_*` | OAuth 登录配置      |    |

> 后端启动时也会从 `WorkingDirectory/.env` 兜底加载（见 `BlogApplication.loadDotEnv()`）；方式一通过 systemd `EnvironmentFile` 注入，两种途径最终效果一致。

---

## 数据库 Schema

后端使用 `spring.jpa.hibernate.ddl-auto=update`：启动时自动创建缺失的表、字段与 `@Table(indexes=...)` 声明的索引，**无需手工执行迁移**。

- 首次部署可用 `init.sql` 初始化基础结构与数据。
- 索引若需提前单独上线，可直接执行 `init.sql` 中对应的 `CREATE INDEX` 语句（带 `IF NOT EXISTS`）。

---

## 升级与回滚

| 方式 | 升级 | 回滚 |
| ---- | ---- | ---- |
| Systemd | 覆盖 jar → `systemctl restart blog` | 换回旧 jar → `systemctl restart blog` |
| Docker | `docker compose up -d --build` | `git revert <commit>` → 重建 |

回滚前建议先备份数据库：

```bash
pg_dump -U <user> blog > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 注意事项

1. **单实例运行**：站点统计（Caffeine 进程内缓存）与访问量计数（进程内 `AtomicLong`）依赖单实例。若横向扩容为多实例，需改用 Redis 统一计数/缓存。
2. **反向代理需设置 `X-Real-IP`**：公共写接口限流依赖 nginx 的 `proxy_set_header X-Real-IP $remote_addr`，否则退化为按 `remoteAddr` 限流。
3. **健康检查**：`GET /actuator/health`，可用于探活。
4. **端口**：默认 `8090`，通过 `SERVER_PORT` 覆盖。
