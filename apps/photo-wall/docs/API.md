# 📙 接口文档 | API Documentation

本文档详细说明照片墙项目的所有API接口定义、请求参数和响应格式。

**基础URL**: `https://hanphone.cn/nodejs/atlas` (生产) / `http://localhost:4001` (开发)

## 📑 目录

- [认证相关](#认证相关)
- [照片展示](#照片展示)
- [照片管理](#照片管理)
- [标签管理](#标签管理)
- [点赞功能](#点赞功能)
- [搜索功能](#搜索功能)
- [访问统计](#访问统计)
- [后台管理](#后台管理)
  - [照片管理](#管理员-照片管理)
  - [用户管理](#管理员-用户管理)
  - [标签管理](#管理员-标签管理)

## 响应格式

### 成功响应

```json
{
  "message": "操作成功描述",
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

### 状态码

| 状态码 | 含义 |
|--------|------|
| 830 | 成功 |
| 0 | 失败/错误 |
| 401 | 未授权（Token无效或缺失） |
| 403 | 权限不足（非管理员） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 认证相关

> 登录注册功能由博客主系统提供，照片墙服务仅验证Token。

### Token验证说明

所有需要认证的接口需在请求头中携带Token：

```
Authorization: Bearer <your-jwt-token>
```

Token Payload 结构：
```json
{
  "username": "用户账号",
  "userType": "1",  // "1"为管理员，其他为普通用户
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## 照片展示

### 获取所有照片

获取照片墙展示数据，包含照片信息和标签。

```
GET /show
```

**请求头** (可选):
| 参数 | 类型 | 说明 |
|------|------|------|
| Authorization | string | Bearer Token（已登录用户可获取点赞状态） |

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    {
      "id": 1,
      "path": "https://example.com/image.jpg",
      "author": "作者名",
      "description": "图片描述",
      "title": "图片标题",
      "type": 1,
      "upload_time": "2024-01-15 10:30:00",
      "likes": 42,
      "user_id": "user123",
      "tags": [
        { "id": 1, "name": "风景" },
        { "id": 2, "name": "旅行" }
      ],
      "isLiked": true
    }
  ]
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 照片唯一ID |
| path | string | 图片URL |
| author | string | 作者名 |
| description | string | 照片描述 |
| title | string | 照片标题 |
| type | integer | 0=待审核, 1=正常, 2=其他 |
| upload_time | string | 上传时间 |
| likes | integer | 点赞数 |
| user_id | string | 上传者ID |
| tags | array | 标签列表 |
| isLiked | boolean | 当前用户是否点赞（需登录） |

---

## 照片管理

### 上传照片

通过URL上传照片到照片墙。

```
POST /upload
```

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | application/json |
| Authorization | string | 是 | Bearer Token |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| urls | array | 是 | 图片URL数组，支持批量上传 |
| userId | string | 是 | 上传用户ID |
| author | string | 否 | 作者名，默认"佚名" |
| title | string | 否 | 标题，默认"未命名" |
| description | string | 否 | 描述，默认"暂无" |

**请求示例**:

```json
{
  "urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "userId": "user123",
  "author": "摄影师",
  "title": "风景照",
  "description": "美丽的风景"
}
```

**响应示例**:

```json
{
  "overallStatus": 830,
  "message": "所有URL保存成功",
  "results": [
    {
      "url": "https://example.com/image1.jpg",
      "status": 830,
      "message": "URL保存成功",
      "fileId": 101
    },
    {
      "url": "https://example.com/image2.jpg",
      "status": 830,
      "message": "URL保存成功",
      "fileId": 102
    }
  ]
}
```

---

## 标签管理

### 获取所有标签

```
GET /getTag
```

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    { "id": 1, "name": "风景" },
    { "id": 2, "name": "人像" },
    { "id": 3, "name": "美食" }
  ]
}
```

---

## 点赞功能

### 点赞/取消点赞

```
POST /likes
```

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | application/json |
| Authorization | string | 是 | Bearer Token |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 照片ID |

**响应示例** (点赞):

```json
{
  "message": "点赞成功",
  "status": 830,
  "action": "like",
  "isLiked": true
}
```

**响应示例** (取消点赞):

```json
{
  "message": "取消点赞成功",
  "status": 830,
  "action": "unlike",
  "isLiked": false
}
```

### 获取用户点赞列表

获取当前用户点赞过的所有照片ID。

```
GET /userLikes
```

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer Token |

**响应示例**:

```json
{
  "message": "获取成功",
  "status": 830,
  "data": [1, 5, 10, 15]
}
```

---

## 搜索功能

### 搜索照片

根据标题或作者搜索照片。

```
POST /search
```

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | application/json |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 |

**请求示例**:

```json
{
  "query": "风景"
}
```

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    {
      "id": 1,
      "title": "美丽风景",
      "author": "摄影师A",
      "path": "https://example.com/image.jpg",
      "upload_time": "2024-01-15 10:30:00",
      "likes": 42
    }
  ]
}
```

---

## 访问统计

### 获取访问统计

```
GET /visitCount
```

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": {
    "visitCount": 1234,
    "last_visit": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 后台管理

> 以下接口需要管理员权限（userType === "1"）

### 管理员 - 照片管理

#### 获取管理端照片列表

```
GET /admin/adminShow
```

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer Token |

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    {
      "id": 1,
      "path": "https://example.com/image.jpg",
      "author": "作者",
      "title": "标题",
      "type": 0,
      "upload_time": "2024-01-15 10:30:00",
      "likes": 42,
      "tags": [{ "id": 1, "name": "风景" }]
    }
  ]
}
```

#### 修改照片类型（审核）

```
POST /admin/changePhotoType
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 照片ID |
| type | integer | 是 | 新类型：0=待审核, 1=正常, 2=其他 |

**请求示例**:

```json
{
  "id": 1,
  "type": 1
}
```

#### 删除照片

```
POST /admin/deletePhoto
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 照片ID |

#### 更新照片信息

```
POST /admin/adminUpdate
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 照片ID |
| title | string | 否 | 新标题 |
| author | string | 否 | 新作者 |
| description | string | 否 | 新描述 |

---

### 管理员 - 用户管理

#### 获取用户列表

```
GET /admin/getUser
```

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    {
      "id": 1,
      "username": "user123",
      "nickname": "昵称",
      "email": "user@example.com",
      "type": "0",
      "createTime": "2024-01-01 00:00:00"
    }
  ]
}
```

#### 删除用户

```
POST /admin/deleteUser
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 用户ID |

#### 修改用户信息

```
POST /admin/changeUser
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 用户ID |
| nickname | string | 否 | 新昵称 |
| type | string | 否 | 用户类型：0=普通，1=管理员 |

---

### 管理员 - 标签管理

#### 获取管理端标签列表

```
GET /admin/getAdminTag
```

**响应示例**:

```json
{
  "message": "查询成功",
  "status": 830,
  "data": [
    { "id": 1, "name": "风景", "count": 15 },
    { "id": 2, "name": "人像", "count": 8 }
  ]
}
```

#### 创建标签

```
POST /admin/createTag
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 标签名称 |

#### 删除标签

```
POST /admin/deleteTag
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 标签ID |

#### 给照片添加标签

```
POST /admin/addTag
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| photoId | integer | 是 | 照片ID |
| tagId | integer | 是 | 标签ID |

#### 删除照片的标签

```
POST /admin/deletePhotoTag
```

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| photoId | integer | 是 | 照片ID |
| tagId | integer | 是 | 标签ID |

---

## 接口汇总表

### 公开接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/show` | 可选 | 获取照片墙数据 |
| GET | `/getTag` | 否 | 获取所有标签 |
| POST | `/upload` | 是 | 上传照片 |
| POST | `/likes` | 是 | 点赞/取消点赞 |
| GET | `/userLikes` | 是 | 获取用户点赞列表 |
| POST | `/search` | 否 | 搜索照片 |
| GET | `/visitCount` | 否 | 获取访问统计 |

### 管理接口（需管理员权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/adminShow` | 获取照片列表（管理端） |
| POST | `/admin/changePhotoType` | 修改照片类型 |
| POST | `/admin/deletePhoto` | 删除照片 |
| POST | `/admin/adminUpdate` | 更新照片信息 |
| GET | `/admin/getUser` | 获取用户列表 |
| POST | `/admin/deleteUser` | 删除用户 |
| POST | `/admin/changeUser` | 修改用户信息 |
| GET | `/admin/getAdminTag` | 获取标签列表（管理端） |
| POST | `/admin/createTag` | 创建标签 |
| POST | `/admin/deleteTag` | 删除标签 |
| POST | `/admin/addTag` | 给照片添加标签 |
| POST | `/admin/deletePhotoTag` | 删除照片的标签 |

---

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权 | Token缺失或过期，重新登录 |
| 403 | 权限不足 | 需要管理员权限 |
| 404 | 资源不存在 | 检查请求的资源ID |
| 405 | 请求方法不允许 | 检查HTTP方法 |
| 500 | 服务器错误 | 联系管理员或稍后重试 |

## 限流说明

当前版本暂未实现限流，后续版本将添加：
- 单IP请求频率限制
- 上传频率限制
- 登录尝试次数限制
