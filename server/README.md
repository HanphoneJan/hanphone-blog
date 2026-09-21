# Hanphone's Blog - 后端

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.12-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.java.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue.svg)](https://www.postgresql.org/)

基于 Spring Boot 3 + JPA/MyBatis-Plus + PostgreSQL 的博客后端 API。

---

## 快速开始

### 环境要求

- JDK 17+, Maven 3.6+
- PostgreSQL 12+, Redis 5.0+

### 启动

```bash
cd server/

# 1. 配置环境变量
cp env.example .env
# 编辑 .env 配置数据库连接、邮箱、JWT 密钥

# 2. 创建数据库
# CREATE DATABASE blog;

# 3. 启动
mvn spring-boot:run
```

> 访客 IP 全球定位（可选）：下载 **DB-IP City Lite** 离线库（mmdb 格式，兼容现有 MaxMind geoip2 读取器，无需改代码），在 `.env` 配置 `GEO_DB_PATH=/绝对路径/GeoLite2-City.mmdb`。未配置或文件缺失时，访客区域解析降级为「未知区域」，不影响其他功能。可运行 `scripts/update-dbip.sh`（或用其 cron 配置）每月自动更新该库。

服务运行在 http://localhost:8090

- API 文档 (Swagger): http://localhost:8090/swagger-ui/index.html
- 健康检查: http://localhost:8090/actuator/health

---

## 环境变量

| 变量               | 说明             | 必需 |
| ------------------ | ---------------- | ---- |
| `TOKEN_SECRET`   | JWT 签名密钥     | ✓   |
| `PG_PASSWORD`    | PostgreSQL 密码  | ✓   |
| `EMAIL_USERNAME` | 邮箱用户名       | ✓   |
| `EMAIL_PASSWORD` | 邮箱 SMTP 授权码 | ✓   |
| `REDIS_PASSWORD` | Redis 密码       | ✓   |

完整配置参考 `env.example`。

---

## 部署

### Maven 打包

```bash
mvn clean package
java -jar target/blog-3.0.jar --spring.profiles.active=prod
```

### 生产部署

支持两种方式，详见 [DEPLOYMENT.md](./DEPLOYMENT.md)：

- **Systemd 原生部署**（当前使用）：主机托管 jar + `EnvironmentFile` 注入 `.env`
- **Docker Compose 部署**：一键拉起 PostgreSQL + Redis + 后端

Docker 完整说明另见 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)。

---

## 项目结构

```
server/
├── .mvn/
│   └── wrapper/                        # Maven Wrapper 配置
├── migrations/                         # 数据库迁移脚本
├── src/
│   ├── main/
│   │   ├── java/com/example/blog/
│   │   │   ├── config/                 # 配置类 (Swagger, 定时任务, Jackson)
│   │   │   ├── constants/              # 常量定义
│   │   │   ├── dao/                    # 数据访问层 (JPA Repository)
│   │   │   ├── DTO/                    # 数据传输对象
│   │   │   ├── enums/                  # 枚举类型
│   │   │   ├── filter/                 # 过滤器 (XSS, URL 长度校验)
│   │   │   ├── handler/                # 全局异常处理
│   │   │   ├── interceptor/            # 拦截器 (JWT Token)
│   │   │   ├── po/                     # 实体类
│   │   │   ├── service/
│   │   │   │   └── impl/               # 业务逻辑实现类
│   │   │   ├── util/                   # 工具类
│   │   │   ├── vo/                     # 视图对象
│   │   │   └── web/
│   │   │       └── admin/              # 管理员接口控制器
│   │   └── resources/
│   │       └── application.properties  # 应用配置文件
│   └── test/
│       └── java/com/example/blog/
│           ├── constants/              # 常量测试
│           ├── po/                     # 实体类测试
│           ├── util/                   # 工具类测试
│           └── web/                    # 接口测试
├── test.py                             # 安全 & 功能回归测试 (Python)
├── stress_test.py                      # 压力测试 (Python)
├── DEPLOYMENT.md                       # 部署指南（Systemd / Docker）
├── docker-compose.yml
├── Dockerfile
└── pom.xml
```
