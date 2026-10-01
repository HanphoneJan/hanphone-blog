# HanPhone Chat - Client

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-4.4-646CFF.svg)](https://vitejs.dev/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.8-red.svg)](https://ant.design/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-white.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](../LICENSE)

> 现代化的实时聊天应用前端，基于 React + TypeScript + Socket.IO 构建

## ✨ 特性

- 🚀 **实时通信** - 基于 Socket.IO 的 WebSocket 双向通信，消息即时推送
- 👥 **用户角色系统** - 支持普通用户和管理员两种角色，不同的界面和功能
- 🤖 **AI 对话模式** - 通过 Server 转发至 Agent Service，支持 AI/真人模式切换
- 🎨 **现代化 UI** - 使用 Ant Design 组件库 + Tailwind CSS，界面美观简洁
- 📱 **响应式设计** - 完美适配桌面端和移动端，支持小屏幕自适应
- 🎤 **语音输入** - 支持浏览器原生语音识别功能（Chrome 等现代浏览器）
- 🔐 **JWT 认证** - 基于 Token 的身份认证机制，安全可靠
- 💬 **消息持久化** - 支持历史消息加载和查看
- 🔔 **在线状态** - 实时显示用户在线/离线状态
- 🎯 **TypeScript** - 完整的类型定义，提供优秀的开发体验

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2.0 | 前端框架 |
| TypeScript | 5.0.2 | 类型安全的 JavaScript 超集 |
| Vite | 4.4.5 | 下一代前端构建工具 |
| Ant Design | 5.8.4 | 企业级 UI 组件库 |
| React Router | 6.14.2 | React 路由管理 |
| Socket.IO Client | 4.7.2 | WebSocket 客户端库 |
| Axios | 1.4.0 | HTTP 客户端 |
| Tailwind CSS | 3.3.3 | 原子化 CSS 框架 |

## 📦 安装

### 环境要求

- Node.js >= 20.5
- pnpm >= 9

### 克隆项目

```bash
git clone https://github.com/yourusername/hanphone-chat.git
cd hanphone-chat/client
```

### 安装依赖

```bash
pnpm install
```

## ⚙️ 配置

### 环境变量

在项目根目录创建 `.env` 文件（如果需要自定义配置）：

```env
VITE_API_URL=http://localhost:4010
VITE_SOCKET_URL=http://localhost:4010
```

### 开发代理配置

在 `vite.config.ts` 中配置代理，将 API 请求转发到后端服务器：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4010',
      changeOrigin: true
    },
    '/chat-api': {
      target: 'http://localhost:4010',
      changeOrigin: true,
      ws: true
    }
  }
}
```

## 🚀 使用

### 开发模式

```bash
pnpm dev
```

访问 `http://localhost:4010` 查看应用

### 生产构建

```bash
pnpm build
```

构建产物将输出到 `dist` 目录

### 预览构建

```bash
pnpm preview
```

## 📁 项目结构

```
client/
├── public/              # 静态资源
├── src/
│   ├── components/      # React 组件
│   │   └── MessageBubble.tsx  # 消息气泡组件
│   ├── contexts/        # React Context
│   │   └── ChatContext.tsx    # 聊天上下文（状态管理）
│   ├── pages/           # 页面组件
│   │   ├── AdminPage.tsx     # 管理员页面
│   │   ├── ChatPage.tsx      # 用户聊天页面
│   │   └── LoginPage.tsx     # 登录页面
│   ├── styles/          # 样式文件
│   ├── utils/           # 工具函数
│   │   └── authService.ts    # 认证相关工具
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx         # 应用入口
│   └── types.ts         # TypeScript 类型定义
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
└── vite.config.ts       # Vite 配置
```

## 🔑 核心功能

### 1. 用户认证

- 支持 Token 持久化存储
- 自动登录状态保持
- Token 过期自动跳转登录

### 2. 实时消息

- 基于 Socket.IO 的双向通信
- 消息实时推送和接收
- 断线重连机制
- 临时消息乐观更新

### 3. AI 智能对话

- AI 回复由 Agent Service（Python FastAPI）生成，Server 透传 SSE 流式响应
- AI 思考/生成状态实时显示
- 支持切换 AI/真人回复模式

### 4. 管理员功能

- 查看所有用户列表
- 按最新消息时间排序
- 与指定用户实时对话
- 查看用户历史消息记录

### 5. 语音输入

- 使用浏览器原生语音识别 API
- 支持中文语音识别
- 实时显示识别结果

## 🎨 界面预览

### 用户聊天页面
- 简洁的消息列表
- 区分自己/对方/AI 消息样式
- 语音输入按钮
- AI/真人模式切换

### 管理员页面
- 左侧用户列表（可搜索）
- 右侧聊天区域
- 显示用户在线状态
- 支持快速切换用户

### 登录页面
- 用户名/密码登录
- 自动登录选项
- 表单验证

## 🔌 API 接口

### 认证接口

#### 登录
```http
POST /api/login
Content-Type: application/json

{
  "username": "janhizian",
  "password": "password"
}
```

#### 获取管理员信息
```http
GET /api/admin/info
Authorization: Bearer <token>
```

### 消息接口

#### 获取历史消息（用户）
```http
GET /api/messages/admin
Authorization: Bearer <token>
```

#### 获取历史消息（管理员）
```http
GET /api/messages/:userId
Authorization: Bearer <token>
```

### Socket.IO 事件

#### 客户端发送

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `authenticate` | `token: string` | Socket 连接认证 |
| `userMessage` | `message: string, tempId?: string, toAi?: boolean` | 用户发送消息 |
| `disconnect` | - | 断开连接 |

#### 服务端推送

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `message` | `message: Message` | 新消息推送 |
| `aiStatus` | `status: { status, message }` | AI 状态更新 |
| `notification` | `message: string` | 通知消息 |
| `error` | `error: string` | 错误消息 |

## 🧩 组件说明

### MessageBubble

消息气泡组件，用于显示单条消息。

**Props:**
- `message: Message` - 消息对象
- `isOwn: boolean` - 是否为当前用户发送的消息
- `userAvatar: string` - 当前用户头像
- `senderAvatar: string` - 发送者头像

### ChatContext

全局聊天状态管理，使用 React Context API。

**提供的 Context 值:**
```typescript
{
  user: User | null;           // 当前登录用户
  token: string | null;        // 认证 Token
  socket: Socket | null;        // Socket.IO 实例
  messages: Message[];         // 消息列表
  onlineUsers: User[];         // 在线用户列表
  selectedUser: User | null;   // 选中的用户（管理员）
  login: (username, password) => Promise<boolean>;
  logout: () => void;
  sendMessage: (content, toAi?) => void;
  sendAdminMessage: (userId, content) => void;
  selectUser: (user) => void;
  loadHistoryMessages: () => void;
  // ...
}
```

## 🐛 常见问题

### Q: Socket.IO 连接失败？

A: 请检查：
1. 后端服务是否正常运行
2. `VITE_SOCKET_URL` 是否配置正确
3. 网络连接是否正常

### Q: 语音输入不可用？

A: 请确保：
1. 使用 Chrome 或其他支持 Web Speech API 的现代浏览器
2. 浏览器已授予麦克风权限
3. 静态 HTTPS 环境或 localhost

### Q: AI 回复没有响应？

A: 可能原因：
1. AI 模式未开启
2. 后端 AI 服务未配置
3. 网络请求超时

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](../LICENSE)

## 👤 作者

**HanphoneJan** - [GitHub](https://github.com/yourusername)

## 🙏 致谢

- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Socket.IO](https://socket.io/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

如果这个项目对您有帮助，请给个 ⭐️ Star 支持一下！
