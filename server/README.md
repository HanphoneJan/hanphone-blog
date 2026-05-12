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

服务运行在 http://localhost:8090

- API 文档 (Swagger): http://localhost:8090/swagger-ui/index.html
- 健康检查: http://localhost:8090/actuator/health

---

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `TOKEN_SECRET` | JWT 签名密钥 | ✓ |
| `PG_PASSWORD` | PostgreSQL 密码 | ✓ |
| `EMAIL_USERNAME` | 邮箱用户名 | ✓ |
| `EMAIL_PASSWORD` | 邮箱 SMTP 授权码 | ✓ |
| `REDIS_PASSWORD` | Redis 密码 | ✓ |

完整配置参考 `env.example`。

---

## 部署

### Maven 打包

```bash
mvn clean package
java -jar target/blog.jar --spring.profiles.active=prod
```

### Docker 部署（推荐）

```bash
# 一键启动 PostgreSQL + Redis + 后端
docker compose up -d
```

详细说明: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

---

## 项目结构

```
server/
├── src/main/java/com/example/blog/
│   ├── config/         # 配置类 (Swagger, 定时任务, Jackson)
│   ├── constants/      # 常量定义
│   ├── dao/            # 数据访问层 (JPA Repository)
│   ├── DTO/            # 数据传输对象
│   ├── enums/          # 枚举类型
│   ├── filter/         # 过滤器 (XSS, URL 长度校验)
│   ├── handler/        # 全局异常处理
│   ├── interceptor/    # 拦截器 (JWT Token)
│   ├── po/             # 实体类
│   ├── service/        # 业务逻辑层
│   ├── util/           # 工具类
│   ├── vo/             # 视图对象
│   └── web/            # Controller 控制器 + admin/
├── src/main/resources/
│   └── application.properties
├── src/test/           # Java 单元测试 (JUnit 5)
├── test.py             # 安全 & 功能回归测试 (Python)
├── stress_test.py      # 压力测试 (Python)
├── docker-compose.yml
├── Dockerfile
└── pom.xml
```

---

## 相关文档

- [Docker 部署](./DOCKER_DEPLOYMENT.md) - 生产环境部署指南
- [Swagger 使用](./SWAGGER_USAGE.md) - API 注解规范（SpringDoc OpenAPI 3）
- [前端文档](../web/README.md) - 前端开发指南
