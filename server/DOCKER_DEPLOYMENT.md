# Docker 部署教程

使用 Docker Compose 部署后端服务（PostgreSQL + Redis + Spring Boot）。

> [返回后端文档](./README.md)

## 📋 目录

- [前置要求](#前置要求)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [常用命令](#常用命令)
- [生产环境部署](#生产环境部署)
- [故障排查](#故障排查)

## 🔧 前置要求

在开始部署之前，请确保您的系统已安装以下软件：

### 必需组件

| 组件           | 最低版本 | 安装链接                                              |
| -------------- | -------- | ----------------------------------------------------- |
| Docker         | 20.10+   | [官方安装指南](https://docs.docker.com/engine/install/)  |
| Docker Compose | 2.0+     | [官方安装指南](https://docs.docker.com/compose/install/) |

### 验证安装

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version
```

## 🚀 快速部署

### 1. 进入后端目录

```bash
cd server/
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# Linux/Mac
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```bash
# JWT 密钥（请修改为随机字符串）
TOKEN_SECRET=your_random_secret_key_here
JWT_ISSUER=auth0
JWT_EXPIRE_TIME=604800000

# 数据库密码（请修改为强密码）
PG_PASSWORD=your_strong_postgres_password

# 邮箱配置
EMAIL_FROM_NAME=管理员
EMAIL_USERNAME=your_email@163.com
EMAIL_PASSWORD=your_email_smtp_password
EMAIL_HOST=smtp.163.com

# Redis 密码（请修改为强密码）
REDIS_PASSWORD=your_strong_redis_password

# 服务器端口
SERVER_PORT=8090
```

### 3. 使用 Docker Compose 部署

```bash
# 构建并启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f blog
```

### 4. 验证部署

```bash
# 检查服务状态
docker compose ps

# 测试健康检查
curl http://localhost:8090/actuator/health
```

### 5. 访问应用

- 应用地址：http://localhost:8090
- API 文档：http://localhost:8090/swagger-ui/index.html
- 健康检查：http://localhost:8090/actuator/health

## ⚙️ 详细配置

### 服务架构

部署包含以下三个服务：

```
┌─────────────┐         ┌─────────────┐
│   Blog App  │────────▶│ PostgreSQL  │
│  Port:8090  │         │  Port:5432  │
└─────────────┘         └─────────────┘
       │                       │
       └──────────────────────┘
               │
               ▼
        ┌─────────────┐
        │    Redis    │
        │  Port:6379  │
        └─────────────┘
```

### 环境变量说明

| 变量名              | 说明                 | 默认值       | 必填 |
| ------------------- | -------------------- | ------------ | ---- |
| `TOKEN_SECRET`    | JWT 签名密钥         | -            | 是   |
| `JWT_ISSUER`      | JWT 签发者           | auth0        | 否   |
| `JWT_EXPIRE_TIME` | JWT 过期时间（毫秒） | 604800000    | 否   |
| `PG_PASSWORD`     | PostgreSQL 密码      | -            | 是   |
| `EMAIL_FROM_NAME` | 邮件发送者名称       | 管理员       | 否   |
| `EMAIL_USERNAME`  | 邮箱用户名           | -            | 是   |
| `EMAIL_PASSWORD`  | 邮箱授权码           | -            | 是   |
| `EMAIL_HOST`      | SMTP 服务器地址      | smtp.163.com | 否   |
| `REDIS_PASSWORD`  | Redis 密码           | -            | 是   |
| `SERVER_PORT`     | 应用端口             | 8090         | 否   |

### 端口映射

| 容器端口 | 主机端口 | 协议 | 说明       |
| -------- | -------- | ---- | ---------- |
| 8090     | 8090     | TCP  | Blog 应用  |
| 5432     | 5432     | TCP  | PostgreSQL |
| 6379     | 6379     | TCP  | Redis      |

### 数据卷

| 数据卷            | 挂载路径                     | 说明                  |
| ----------------- | ---------------------------- | --------------------- |
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL 数据持久化 |
| `redis_data`    | `/data`                    | Redis 数据持久化      |
| `./logs`        | `/app/logs`                | 应用日志目录          |

## 📝 常用命令

### Docker Compose 命令

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 启动并显示实时日志
docker compose up

# 停止所有服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 重启所有服务
docker compose restart

# 重启指定服务
docker compose restart blog

# 查看服务状态
docker compose ps

# 查看日志（所有服务）
docker compose logs

# 查看指定服务日志
docker compose logs -f blog

# 查看实时日志
docker compose logs -f --tail=100

# 构建镜像
docker compose build

# 重新构建并启动
docker compose up -d --build

# 进入容器
docker compose exec blog bash

# 查看资源使用情况
docker stats
```

### 单独构建 Docker 镜像

```bash
# 构建镜像
docker build -t blog-backend:latest .

# 使用自定义配置运行
docker run -d \
  --name blog-backend \
  -p 8090:8090 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  blog-backend:latest

# 查看日志
docker logs -f blog-backend

# 停止容器
docker stop blog-backend

# 删除容器
docker rm blog-backend

# 删除镜像
docker rmi blog-backend:latest
```

## 🏭 生产环境部署

### 1. 使用生产级配置

创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: blog-postgres-prod
    restart: always
    environment:
      POSTGRES_DB: blog
      POSTGRES_USER: bloguser
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
    networks:
      - blog-network

  redis:
    image: redis:7-alpine
    container_name: blog-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - blog-network

  blog:
    image: blog-backend:latest
    container_name: blog-backend-prod
    restart: always
    environment:
      PG_USERNAME: bloguser
      PG_PASSWORD: ${PG_PASSWORD}
      PG_HOST: postgres
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      TOKEN_SECRET: ${TOKEN_SECRET}
      EMAIL_USERNAME: ${EMAIL_USERNAME}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      SERVER_PORT: 8090
    volumes:
      - ./logs:/app/logs
    ports:
      - "8090:8090"
    networks:
      - blog-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
  redis_data:

networks:
  blog-network:
    driver: bridge
```

### 2. 启动生产环境

```bash
# 使用生产配置启动
docker compose -f docker-compose.prod.yml up -d

# 查看状态
docker compose -f docker-compose.prod.yml ps
```

### 3. 配置 Nginx 反向代理

创建 `nginx.conf`：

```nginx
upstream blog_backend {
    server blog:8090;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 日志配置
    access_log /var/log/nginx/blog_access.log;
    error_log /var/log/nginx/blog_error.log;

    # 反向代理配置
    location /api/ {
        proxy_pass http://blog_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Swagger UI（可选，用于 API 文档查看）
    location /swagger-ui/ {
        proxy_pass http://blog_backend/swagger-ui/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 生产环境建议关闭或限制访问：
    # location /swagger-ui/ {
    #     deny all;
    # }
}
```

启动 Nginx：

```bash
docker run -d \
  --name nginx-proxy \
  -p 80:80 -p 443:443 \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf \
  -v $(pwd)/ssl:/etc/nginx/ssl \
  --network blog-network \
  nginx:alpine
```

### 4. 配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到 Nginx 目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem

# 设置自动续期
sudo certbot renew --dry-run
```

### 5. 性能优化

#### JVM 参数优化

在 `docker-compose.yml` 中调整 `JAVA_OPTS`：

```yaml
environment:
  JAVA_OPTS: >-
    -Xms512m
    -Xmx1024m
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=200
    -XX:+HeapDumpOnOutOfMemoryError
    -XX:HeapDumpPath=/logs/heapdump.hprof
    -Djava.security.egd=file:/dev/./urandom
```

#### 数据库优化

在 `postgresql.conf` 中配置：

```ini
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 1310kB
min_wal_size = 1GB
max_wal_size = 4GB
```

#### Redis 优化

在 `docker-compose.yml` 中配置 Redis 命令：

```yaml
redis:
  command: >-
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --save 900 1
    --save 300 10
    --save 60 10000
```

## 🔍 故障排查

### 常见问题

#### 1. 容器无法启动

```bash
# 查看详细日志
docker compose logs blog

# 检查端口占用
netstat -tulpn | grep 8090

# 检查环境变量
docker compose config
```

#### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose ps postgres

# 进入 PostgreSQL 容器
docker compose exec postgres psql -U bloguser -d blog

# 测试连接
docker compose exec blog curl postgres:5432
```

#### 3. Redis 连接失败

```bash
# 检查 Redis 状态
docker compose ps redis

# 进入 Redis 容器
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

# 测试连接
docker compose exec blog curl redis:6379
```

#### 4. 健康检查失败

```bash
# 手动执行健康检查
docker compose exec blog curl -f http://localhost:8090/actuator/health

# 检查应用日志
docker compose logs -f blog
```

#### 5. 日志查看

```bash
# 实时查看所有服务日志
docker compose logs -f

# 查看特定服务最近 100 行日志
docker compose logs --tail=100 blog

# 导出日志到文件
docker compose logs > deployment.log
```

### 调试模式

启用调试日志：

```bash
# 临时启用调试
docker compose exec blog bash -c "export JAVA_OPTS='-Dlogging.level.com.example.blog=DEBUG' && java -jar /app/blog.jar"
```

### 容器资源限制

```yaml
# 在 docker-compose.yml 中添加
services:
  blog:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 备份与恢复

#### 数据库备份

```bash
# 备份 PostgreSQL 数据
docker compose exec postgres pg_dump -U bloguser blog > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker compose exec -T postgres psql -U bloguser blog < backup_20240101_120000.sql
```

#### Redis 备份

```bash
# 备份 Redis 数据
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} BGSAVE

# 复制备份文件
docker cp blog-redis-prod:/data/dump.rdb ./redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

## 📊 监控与日志

### 使用 Docker 内置监控

```bash
# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect blog-backend
```

### 日志管理

```yaml
# 在 docker-compose.yml 中配置日志
services:
  blog:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔒 安全建议

1. **使用强密码**：所有环境变量中的密码应使用强随机字符串
2. **限制网络访问**：使用防火墙限制端口访问
3. **定期更新**：定期更新 Docker 镜像和依赖
4. **启用 HTTPS**：生产环境必须使用 HTTPS
5. **关闭调试端口**：生产环境可以考虑关闭 Swagger 或通过 Nginx 限制访问
6. **最小权限原则**：容器内使用非 root 用户运行

## 📚 参考链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Spring Boot Docker 指南](https://spring.io/guides/topicals/spring-boot-docker/)
- [PostgreSQL Docker 镜像](https://hub.docker.com/_/postgres)
- [Redis Docker 镜像](https://hub.docker.com/_/redis)

## 💡 提示

- 首次启动可能需要较长时间来下载镜像和构建应用
- 建议在部署前先在本地环境测试
- 定期备份数据库和 Redis 数据
- 使用 `docker compose down -v` 会删除所有数据，请谨慎操作

---

如有问题，请提交 Issue 或联系作者。
