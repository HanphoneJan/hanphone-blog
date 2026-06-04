# 📗 后端技术文档 | Backend Documentation

本文档详细介绍照片墙项目的Node.js后端架构、数据库设计和部署方案。

## 📑 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [核心模块](#核心模块)
- [认证授权](#认证授权)
- [环境配置](#环境配置)
- [部署指南](#部署指南)

## 技术栈

> 💡 **提示**：项目提供 Node.js 和 PHP 两种后端实现。Node.js 版本为当前维护版本，功能最全；PHP 版本已归档，功能相对滞后，仅用于学习参考。

### Node.js 版本（推荐）

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | 5.1.0 | Web框架 |
| PostgreSQL | 14+ | 数据库 |
| pg | 8.16.3 | PostgreSQL驱动 |
| JWT | 9.0.2 | 身份认证 |
| bcrypt | 6.0.0 | 密码加密 |
| express-session | 1.18.2 | Session管理 |
| multer | 2.0.2 | 文件上传 |
| cors | 2.8.5 | 跨域处理 |
| dotenv | 17.2.3 | 环境变量 |

## 项目结构

```
backend/nodejs/
├── app.js                    # 应用入口
├── config/
│   └── db.js                # 数据库连接池配置
├── controller/              # 控制器
│   ├── show.js              # 照片展示
│   ├── upload.js            # 照片上传
│   ├── likes.js             # 点赞功能
│   ├── search.js            # 搜索功能
│   ├── getTag.js            # 获取标签
│   ├── visitCount.js        # 访问统计
│   └── admin/               # 管理后台控制器
│       ├── adminShow.js     # 管理端照片列表
│       ├── changePhotoType.js
│       ├── deletePhoto.js
│       ├── adminUpdate.js
│       ├── getUser.js
│       ├── deleteUser.js
│       ├── changeUser.js
│       ├── deleteTag.js
│       ├── createTag.js
│       ├── getAdminTag.js
│       ├── addTag.js
│       └── deletePhotoTag.js
├── middleware/
│   └── interceptor.js       # 请求拦截器（JWT验证）
├── routes/
│   ├── index.js             # 公开路由
│   └── admin.js             # 管理路由
├── utils/
│   └── token.js             # JWT工具函数
├── tmp/                     # 临时文件目录
├── package.json
└── .env                     # 环境变量（需创建）
```

## 数据库设计

### 表结构

#### 1. atlas_files - 照片表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键，自增 |
| path | VARCHAR(128) | 图片URL路径 |
| author | VARCHAR(64) | 作者名 |
| description | VARCHAR(512) | 描述 |
| title | VARCHAR(24) | 标题 |
| type | INTEGER | 类型：0-待审核, 1-正常, 2-其他 |
| upload_time | VARCHAR(24) | 上传时间 |
| likes | INTEGER | 点赞数 |
| user_id | VARCHAR(64) | 上传用户ID |

#### 2. atlas_tag - 标签表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键，自增 |
| name | VARCHAR(128) | 标签名称（唯一） |

#### 3. atlas_files_tag - 照片标签关联表

| 字段 | 类型 | 说明 |
|------|------|------|
| files_id | INTEGER | 照片ID |
| tag_id | INTEGER | 标签ID |
| PRIMARY KEY | (files_id, tag_id) | 联合主键 |

#### 4. user_likes - 用户点赞记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | VARCHAR(64) | 用户ID |
| photo_id | INTEGER | 照片ID |
| created_at | TIMESTAMP | 点赞时间 |
| UNIQUE | (user_id, photo_id) | 联合唯一 |

#### 5. visitcounts - 访问统计表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| visitCount | INTEGER | 访问计数 |
| last_visit | TIMESTAMP | 最后访问时间 |

### 数据库初始化

```sql
-- 创建照片表
CREATE TABLE atlas_files (
    id SERIAL PRIMARY KEY,
    path VARCHAR(128) NOT NULL,
    author VARCHAR(64) NOT NULL,
    description VARCHAR(512) NOT NULL DEFAULT '暂无',
    title VARCHAR(24) NOT NULL DEFAULT '未命名',
    type INTEGER NOT NULL DEFAULT 0,
    upload_time VARCHAR(24) NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    user_id VARCHAR(64)
);

-- 创建标签表
CREATE TABLE atlas_tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL
);

-- 创建照片标签关联表
CREATE TABLE atlas_files_tag (
    files_id INTEGER REFERENCES atlas_files(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES atlas_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (files_id, tag_id)
);

-- 创建用户点赞表
CREATE TABLE user_likes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    photo_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, photo_id)
);
CREATE INDEX idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX idx_user_likes_photo_id ON user_likes(photo_id);

-- 创建访问统计表
CREATE TABLE visitcounts (
    id SERIAL PRIMARY KEY,
    visitCount INTEGER NOT NULL DEFAULT 0,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 核心模块

### 1. 数据库连接池

```javascript
// config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'blog',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000
});

async function getDbConnection() {
  return await pool.connect();
}

module.exports = { getDbConnection };
```

### 2. 应用入口

```javascript
// app.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { interceptRequest } = require('./middleware/interceptor');

const app = express();

// Session配置
app.use(session({
  secret: process.env.SESSION_SECRET || '123456',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 拦截器
app.use(interceptRequest);

// 路由
app.use('/', require('./routes/index'));
app.use('/admin', require('./routes/admin'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`服务器运行在 localhost:${PORT}`);
});
```

### 3. 路由定义

```javascript
// routes/index.js - 公开路由
const express = require('express');
const router = express.Router();

router.get('/visitCount', visitCountController.visitCount);
router.get('/show', showController.show);
router.post('/upload', uploadController.upload);
router.post('/likes', likesController.likes);
router.get('/userLikes', likesController.getUserLikes);
router.post('/search', searchController.search);
router.get('/getTag', getTagController.getTag);

module.exports = router;
```

```javascript
// routes/admin.js - 管理路由（需管理员权限）
const express = require('express');
const router = express.Router();

router.get('/adminShow', adminShowController.adminShow);
router.post('/changePhotoType', changePhotoTypeController.changePhotoType);
router.post('/deletePhoto', deletePhotoController.deletePhoto);
router.get('/getUser', getUserController.getUser);
router.post('/deleteUser', deleteUserController.deleteUser);
// ... 其他管理接口

module.exports = router;
```

## 认证授权

### JWT工具函数

```javascript
// utils/token.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
```

### 请求拦截器

```javascript
// middleware/interceptor.js
const { verifyToken } = require('../utils/token');

function interceptRequest(req, res, next) {
  const adminPath = '/admin/';
  const authOptionalPaths = ['/likes', '/show', '/userLikes'];
  
  const authHeader = req.headers.authorization || req.headers.token;
  const token = extractToken(authHeader);

  // 管理接口需要验证
  if (req.path.startsWith(adminPath)) {
    if (!token) {
      return res.status(401).json({ message: '未授权的请求' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: '无效的 token' });
    }

    if (payload.userType !== "1") {
      return res.status(403).json({ message: '权限不足' });
    }
    
    req.user = payload;
    next();
  } else if (authOptionalPaths.some(path => req.path.startsWith(path))) {
    // 可选认证路径
    if (token) {
      const payload = verifyToken(token);
      if (payload) req.user = payload;
    }
    next();
  } else {
    next();
  }
}
```

### 认证流程

1. 用户登录获取JWT Token
2. 前端存储Token（localStorage）
3. 请求时携带Token（Authorization: Bearer <token>）
4. 后端验证Token有效性
5. 管理接口额外验证用户类型（userType === "1"）

## 环境配置

### 环境变量文件

```bash
# .env
# 服务器配置
PORT=4001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=blog

# 安全配置
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret

# 其他配置
UPLOAD_PATH=/path/to/uploads
```

### 配置说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| PORT | 否 | 4001 | 服务端口 |
| NODE_ENV | 否 | development | 运行环境 |
| DB_HOST | 是 | - | 数据库主机 |
| DB_PORT | 否 | 5432 | 数据库端口 |
| DB_USER | 是 | - | 数据库用户 |
| DB_PASSWORD | 是 | - | 数据库密码 |
| DB_NAME | 是 | - | 数据库名 |
| JWT_SECRET | 是 | - | JWT密钥 |
| SESSION_SECRET | 是 | - | Session密钥 |

## 部署指南

### 本地开发

```bash
cd backend/nodejs

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写配置

# 启动服务
npm start

# 或使用 PM2
npm install -g pm2
pm2 start app.js --name "photo-wall-api"
```

### 生产部署

#### 使用 PM2

```bash
# ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'photo-wall-api',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};

# 启动
pm2 start ecosystem.config.cjs

# 重启
pm2 restart photo-wall-api

# 查看日志
pm2 logs photo-wall-api
```

#### 使用 Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4001

CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "4001:4001"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=blog
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
  
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=blog
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name hanphone.cn;
    
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API响应规范

### 成功响应

```json
{
  "message": "操作成功",
  "status": 830,
  "data": { }
}
```

### 错误响应

```json
{
  "message": "错误描述",
  "status": 0,
  "data": null
}
```

### 状态码说明

| 状态码 | 含义 |
|--------|------|
| 830 | 成功 |
| 0 | 失败/错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 性能优化

### 数据库优化

- 使用连接池复用连接
- 点赞表添加复合索引
- 及时释放连接（client.release()）

### 安全优化

- 参数化查询防止SQL注入
- JWT Token验证
- CORS跨域控制
- Session安全配置

## 监控与日志

```javascript
// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 错误日志
app.use((err, req, res, next) => {
  console.error(`[Error] ${new Date().toISOString()}:`, err);
  res.status(500).json({ message: '服务器内部错误' });
});
```
