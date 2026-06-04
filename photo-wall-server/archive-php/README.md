# PHP 后端（已归档）

> ⚠️ **注意**：此 PHP 实现已归档，功能落后于 Node.js 版本，仅用于学习参考。生产环境请使用 `backend/nodejs/`。

当前目录是照片墙后端的 PHP 实现，基于 PHP + MySQL 构建。

## 项目介绍

系统使用 `JWT` 进行用户认证，并提供普通用户接口与管理员接口。

- 用户认证
- 邮箱验证码
- 照片上传、查看、搜索、点赞
- 管理员照片与标签管理
- 用户管理

## 目录结构

```text
php/
├── application.php
├── atlas.sql
├── nginx.conf
├── user.ini
├── config/
├── controller/
├── interceptor/
└── tmp/
```

## 启动与部署

### 1. 修改配置

先复制环境变量示例文件，再按实际环境修改：

```bash
cp .env.example .env
```

主要配置项包括：

- `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`
- `SECRET_KEY`、`JWT_ISSUER`、`JWT_AUDIENCE`
- `INTERNAL_PATH`、`EXTERN_PATH`
- `SMTP_SERVER`、`SMTP_PORT`、`SMTP_USERNAME`、`SMTP_PASSWORD`

### 2. 初始化数据库

```bash
mysql -u root -p < atlas.sql
```

### 3. 本地启动

```bash
php -S 127.0.0.1:3003 application.php
```

### 4. 生产部署

- 可参考当前目录下的 `nginx.conf`
- 高并发场景建议改为 `PHP-FPM + Nginx`

