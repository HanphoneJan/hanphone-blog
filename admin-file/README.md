# admin-file 📂

![Node.js](https://img.shields.io/badge/Node.js-≥18.x-green?logo=node.js&logoColor=white)![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey?logo=express&logoColor=white)![Multer](https://img.shields.io/badge/Multer-2.0.2-orange)![Swagger](https://img.shields.io/badge/Swagger-5.0.1-green)![JWT](https://img.shields.io/badge/JWT-Auth-blue)

Node.js 实现的轻量级文件管理接口服务，提供完整的文件和目录管理功能，支持 JWT 认证、Swagger API 文档和完善的日志系统。

## ✨ 功能特性

- 📤 **文件上传** - 支持认证上传（最大1GB）和公共头像上传（最大5MB）
- 👤 **头像上传** - 无需认证的公共接口，支持速率限制（每IP每小时5次）
- 🗑️ **文件删除** - 安全删除指定文件或空目录
- 📁 **目录创建** - 创建命名空间目录
- 📋 **文件管理** - 获取文件列表、文件详情
- 🔍 **文件分类** - 自动识别图片、视频、音频、代码、文档、压缩包、字体等类型
- 🗂️ **命名空间** - 支持按命名空间组织文件
- 📥 **静态访问** - 支持文件预览（图片/PDF/音视频）和下载
- 🔐 **JWT 认证** - 安全的 API 访问控制
- 📖 **Swagger 文档** - 完整的 API 接口文档
- 📝 **日志系统** - 详细的请求和错误日志记录

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18.x
- npm 或 pnpm

### 安装步骤

```bash
# 安装依赖（推荐pnpm）
pnpm install
# 或 npm install

# 启动服务
pnpm start
# 或 npm start
```

### 环境配置

创建 `.env` 文件：

```env
PORT=4000
JWT_SECRET=your-secret-key
```

### 访问 API 文档

启动服务后，访问 Swagger 文档：

```
http://localhost:4000/api-docs
```

## 📡 API 接口

### 公共接口（无需认证）

- `POST /upload/avatar` - 上传头像（支持 jpg/png/gif/webp/avif/svg，≤5MB）

### 认证接口（需要 JWT）

- `POST /upload` - 上传文件（支持所有类型，≤1GB）
- `DELETE /delete` - 删除文件或目录
- `GET /files` - 获取文件列表
- `GET /file` - 获取文件详情
- `POST /directory` - 创建命名空间目录

### 静态文件访问

- `GET /{category}/{filename}` - 访问文件（如 `/images/photo.jpg`）
- `GET /{namespace}/{filename}` - 访问命名空间文件
- 添加 `?download=1` 参数强制下载

更多接口详情，请查看 Swagger 文档。

## 📁 项目结构

```
admin-file/
├── uploads/                 # 上传文件存储目录
│   ├── temp/               # 临时上传目录
│   └── blog/avatars/       # 头像存储目录
├── logs/                   # 日志文件目录
├── server.js               # 主服务器文件
├── token.js               # JWT 认证处理
├── logger.js              # 日志系统
├── package.json           # 项目配置
└── .env                   # 环境变量配置
```
