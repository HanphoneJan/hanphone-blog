import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { AuthService } from './authService.js';
import { PostgresService, ADMIN_ROOM } from './postgresService.js';
import { registerPublicRoomHandler } from './publicRoomHandler.js';
import { ServerToClientEvents, ClientToServerEvents } from './types.js';
import publicRoomRoutes from './publicRoomRoutes.js';

// Agent Service 配置
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';
const AGENT_TIMEOUT_MS = 60000; // Agent Service 请求超时 60 秒
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ''; // Server 与 Agent Service 通信密钥

// 全局兜底：未捕获的 Promise rejection（防止 async Socket handler 导致进程崩溃）
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection] 未捕获的 Promise 异常:', reason);
});

// 全局兜底：未捕获的异常 - 记录后优雅退出，由进程管理器重启
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] 未捕获的异常，进程即将退出:', err);
  // 给日志写入留出时间后退出
  setTimeout(() => process.exit(1), 100);
});

/** 带超时的 fetch */
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = AGENT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// AI回复生成函数 - 调用 Agent Service 微服务（普通返回）
async function generateAiReply(userMessage: string, userId: number, socketId: string, io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>): Promise<string | null> {
  try {
    console.log(`[AI] 用户 ${userId} 请求AI回复: "${userMessage}"`);

    // 1. 立即通知前端AI开始思考
    io.to(socketId).emit('aiStatus', { status: 'thinking', message: 'AI正在思考如何回复...' });

    // 2. 从数据库获取用户信息
    const user = await PostgresService.getUserById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 3. 调用 Agent Service API，传递用户信息
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (INTERNAL_API_KEY) {
      headers['X-Internal-Key'] = INTERNAL_API_KEY;
    }
    const response = await fetchWithTimeout(`${AGENT_SERVICE_URL}/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId.toString(),
        conversation_id: `conv_${userId}_${ADMIN_ROOM}`,
        message: userMessage,
        user_info: {
          username: user.username,
          nickname: user.nickname || user.username,
          email: user.email
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent Service 返回错误: ${response.status} - ${errorText}`);
    }

    // 4. 通知前端AI正在生成回复
    io.to(socketId).emit('aiStatus', { status: 'generating', message: 'AI正在生成回复...' });

    const result = await response.json();

    // 4. 成功获取回复后，通知前端AI已完成
    io.to(socketId).emit('aiStatus', { status: 'completed', message: 'AI回复已完成' });

    console.log(`[AI] AI成功生成回复给用户 ${userId}: "${result.response}"`);
    if (result.thinking) {
      console.log(`[AI] 思考过程: ${result.thinking}`);
    }
    console.log(`[AI] 记忆统计 - L1工作记忆: ${result.L1_working}, L2短期记忆: ${result.L2_short_term}, L3长期记忆: ${result.L3_long_term}, L4核心记忆: ${result.L4_core}`);

    return result.response;
  } catch (error) {
    console.error('[AI] 生成AI回复失败:', error);
    // 5. 如果发生错误，通知前端
    io.to(socketId).emit('aiStatus', { status: 'error', message: 'AI回复生成失败，请稍后再试' });
    return null;
  }
}

// AI流式回复生成函数 - 使用SSE流式传输
async function generateAiReplyStream(userMessage: string, userId: number, socketId: string, io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>): Promise<string | null> {
  let tempMessageId: string | undefined;

  try {
    console.log(`[AI-Stream] 用户 ${userId} 请求AI流式回复: "${userMessage}"`);

    // 1. 立即通知前端AI开始思考
    io.to(socketId).emit('aiStatus', { status: 'thinking', message: 'AI正在思考如何回复...' });

    // 2. 从数据库获取用户信息
    const user = await PostgresService.getUserById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 3. 调用 Agent Service 流式API
    const streamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (INTERNAL_API_KEY) {
      streamHeaders['X-Internal-Key'] = INTERNAL_API_KEY;
    }
    const response = await fetchWithTimeout(`${AGENT_SERVICE_URL}/chat/message/stream`, {
      method: 'POST',
      headers: streamHeaders,
      body: JSON.stringify({
        user_id: userId.toString(),
        conversation_id: `conv_${userId}_${ADMIN_ROOM}`,
        message: userMessage,
        user_info: {
          username: user.username,
          nickname: user.nickname || user.username,
          email: user.email
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent Service 返回错误: ${response.status} - ${errorText}`);
    }

    // 4. 通知前端AI正在生成回复
    io.to(socketId).emit('aiStatus', { status: 'generating', message: 'AI正在生成回复...' });

    // 5. 处理SSE流
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!reader) {
      throw new Error('无法获取响应流');
    }

    // 发送一个空的临时消息，用于流式更新
    io.to(socketId).emit('aiStreamStart', {
      tempId: tempMessageId,
      senderId: 1000,
      receiverId: userId,
      fromAi: true
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              // 只转发 content 类型的事件，过滤 thinking_chunk 避免思考内容泄露到输出
              if (parsed.type === 'content' && parsed.content) {
                fullResponse += parsed.content;
                // 发送流式内容片段
                io.to(socketId).emit('aiStreamChunk', {
                  tempId: tempMessageId,
                  content: parsed.content
                });
              }
              if (parsed.done) {
                // 流式传输完成
                console.log(`[AI-Stream] 流式传输完成`);
              }
            } catch (e) {
              console.error('[AI-Stream] 解析SSE数据失败:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 6. 成功获取回复后，通知前端AI已完成
    io.to(socketId).emit('aiStreamEnd', {
      tempId: tempMessageId,
      content: fullResponse
    });

    io.to(socketId).emit('aiStatus', { status: 'completed', message: 'AI回复已完成' });

    console.log(`[AI-Stream] AI成功生成流式回复给用户 ${userId}: "${fullResponse}"`);

    return fullResponse;
  } catch (error) {
    console.error('[AI-Stream] 生成AI流式回复失败:', error);
    // 通知前端流式传输出错
    if (tempMessageId) {
      io.to(socketId).emit('aiStreamError', { tempId: tempMessageId, error: 'AI回复生成失败' });
    }
    // 7. 如果发生错误，通知前端
    io.to(socketId).emit('aiStatus', { status: 'error', message: 'AI回复生成失败，请稍后再试' });
    return null;
  }
}

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS
const rawOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:4010', 'http://localhost:4011'];
const allowedOrigins = rawOrigins.filter(o => o !== '*');
if (rawOrigins.includes('*')) {
  console.warn('[CORS] 警告: ALLOWED_ORIGINS 包含通配符 *，但 credentials=true 不允许使用 *，已自动移除');
}
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(publicRoomRoutes);

// 健康检查端点（用于 Docker 健康检查）
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hanphone-server', timestamp: new Date().toISOString() });
});

// [调试日志] 添加一个中间件来打印所有传入的HTTP请求
app.use((req, res, next) => {
  console.log(`[HTTP Request] ${req.method} ${req.url}`);
  next();
});

// 创建Socket.IO服务器
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: corsOptions,
  // 明确指定path，虽然是默认值，但写出来更清晰
  path: '/chat-api/socket.io' 
});

// [调试日志] 打印Socket.IO配置
console.log('[Socket.IO] Socket.IO server configured with path:', io.path());

// 中间件：验证token并获取用户信息
async function authenticateUser(req: Request, res: Response, next: Function) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '缺少认证令牌' });
    }
    
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: '无效的认证令牌' });
    }

    const userId = parseInt(payload.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: '无效的用户ID' });
    }

    const user = await PostgresService.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    // 将用户信息附加到请求对象
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
}

// 中间件：验证管理员权限
function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (user.type !== '1') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }
  next();
}

// 中间件：验证普通用户权限
function requireRegularUser(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (user.type !== '0') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }
  next();
}

// 获取在线用户列表（管理员专用）
app.get('/chat-api/api/users', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const onlineUsers = await PostgresService.getOnlineUsers();
    res.json({ success: true, users: onlineUsers });
  } catch (error) {
    console.error('获取在线用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取所有用户列表（管理员专用）
app.get('/chat-api/api/users/all', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await PostgresService.getAllUsers();
    res.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('获取所有用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取所有用户列表并按最新消息时间排序（管理员专用）
app.get('/chat-api/api/users/sorted', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const usersWithLatestMessage = await PostgresService.getAllUsersWithLatestMessage();
    res.json({ success: true, users: usersWithLatestMessage });
  } catch (error) {
    console.error('获取排序用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取与管理员的聊天记录（普通用户使用）
app.get('/chat-api/api/messages/admin', authenticateUser, requireRegularUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // 可选 ?limit=（1~500，默认 200），只返回最近 N 条
    const limitRaw = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
    const messages = await PostgresService.getMessagesForUser(user.id, limit);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取与特定用户的聊天记录（管理员使用）
app.get('/chat-api/api/messages/:userId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userIdNum = parseInt(userId, 10);
  if (isNaN(userIdNum)) {
    return res.status(400).json({ success: false, message: '无效的用户ID' });
  }

  try {
    // 可选 ?limit=（1~500，默认 200），只返回最近 N 条
    const limitRaw = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
    const messages = await PostgresService.getAdminUserMessages(userIdNum, limit);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取管理员用户信息（userId=1000）
app.get('/chat-api/api/user/admin', authenticateUser, async (req: Request, res: Response) => {
  try {
    const adminUser = await PostgresService.getUserById(1000);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: '管理员用户不存在' });
    }
    
    // 返回管理员信息（排除密码）
    res.json({ 
      success: true, 
      user: {
        id: adminUser.id,
        username: adminUser.username,
        nickname: adminUser.nickname,
        email: adminUser.email,
        avatar: adminUser.avatar,
        type: adminUser.type,
        isOnline: adminUser.isOnline
      }
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ========== 在线状态追踪 ==========
// 记录每个已认证 socket 的最后心跳时间
const heartbeatMap = new Map<string, number>();
// 记录所有已认证的在线 userId
const onlineUserIdSet = new Set<number>();

// 注册公共聊天室事件处理
registerPublicRoomHandler(io);

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`[Socket.IO] 新的连接尝试: ${socket.id} from ${socket.handshake.address}`);

  // 认证超时：10秒内必须完成认证，否则断开连接
  const authTimeout = setTimeout(() => {
    if (!socket.data.user) {
      console.log(`[Socket.IO] 用户 ${socket.id} 认证超时，断开连接`);
      socket.emit('notification', '认证超时，请重新连接');
      socket.disconnect(true);
    }
  }, 10000);

  // 用户认证
  socket.on('authenticate', async (token: string) => {
    // 防止并发认证请求导致竞态
    if (socket.data.authenticating) {
      console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 认证正在进行中，忽略重复请求`);
      return;
    }
    socket.data.authenticating = true;

    console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 尝试认证...`);
    try {
      // 清理之前的认证状态（防止重复认证导致房间泄漏）
      if (socket.data.user) {
        const prevUser = socket.data.user;
        socket.leave(prevUser.id.toString());
        socket.leave(ADMIN_ROOM.toString());
        await PostgresService.setUserOnlineStatus(prevUser.id, false);
        delete socket.data.user;
        console.log(`[Socket.IO:authenticate] 清理用户 ${socket.id} 之前的认证状态`);
      }

      const payload = AuthService.verifyToken(token);
      if (!payload) {
        console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 认证失败: 无效的令牌`);
        socket.emit('notification', '认证失败，无效的令牌');
        return;
      }
      
      // 从数据库获取用户信息
      const userId = parseInt(payload.userId, 10);
      if (isNaN(userId)) {
        console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 认证失败: 无效的用户ID`);
        socket.emit('notification', '认证失败，无效的用户ID');
        return;
      }
      const user = await PostgresService.getUserById(userId);
      if (!user) {
        console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 认证失败: 用户不存在 (ID: ${payload.userId})`);
        socket.emit('notification', '用户不存在');
        return;
      }
      
      // 存储用户信息到socket
      socket.data.user = user;
      // 认证成功，清除认证超时定时器
      clearTimeout(authTimeout);
      console.log(`[Socket.IO:authenticate] 用户 ${socket.id} 认证成功: ${user.username} (ID: ${user.id})`);
      
      // 设置用户在线状态
      await PostgresService.setUserOnlineStatus(user.id, true);

      // 记录到在线追踪集合
      onlineUserIdSet.add(user.id);
      heartbeatMap.set(socket.id, Date.now());

      // 根据用户类型加入不同房间
      if (user.type === '0') {
        // 普通用户加入自己的房间
        socket.join(user.id.toString());
        console.log(`[Socket.IO:Room] 用户 ${user.username} (ID: ${user.id}) 加入个人房间: ${user.id}`);
      } else if (user.type === '1') {
        // 管理员加入管理员房间
        socket.join(ADMIN_ROOM.toString());
        console.log(`[Socket.IO:Room] 管理员 ${user.username} (ID: ${user.id}) 加入管理员房间: ${ADMIN_ROOM}`);

        // 获取所有在线用户并发送给管理员
        const onlineUsers = await PostgresService.getOnlineUsers();
        socket.emit('userListUpdated', onlineUsers);

        // 广播管理员上线给所有普通用户
        io.emit('adminOnlineStatus', { isOnline: true });
      }
      
      // 广播用户上线通知
      if (user.type === '0') {
        io.to(ADMIN_ROOM.toString()).emit('userConnected', user);
        console.log(`[Socket.IO:Event] 广播用户上线通知: ${user.username}`);
      }
      
      // 发送认证成功通知
      socket.emit('notification', '认证成功，已连接到聊天服务器');
    } catch (error) {
      console.error(`[Socket.IO:authenticate] 用户 ${socket.id} 认证过程中发生错误:`, error);
      socket.emit('notification', '认证过程中发生错误');
    } finally {
      socket.data.authenticating = false;
    }
  });

  // 客户端心跳
  socket.on('heartbeat', () => {
    heartbeatMap.set(socket.id, Date.now());
  });

  // 处理用户消息
  socket.on('userMessage', async (messageContent: string, tempId?: string, toAi: boolean = false) => {
    // 强制转换为布尔值，防止客户端传入非布尔值
    toAi = toAi === true;
    const user = socket.data.user;
    console.log(`[Socket.IO:userMessage] 收到来自 ${user?.username || '未知用户'} (ID: ${user?.id || 'N/A'}) 的消息: "${messageContent}" (AI模式: ${toAi})`);

    if (!user || user.type !== '0') {
      console.log(`[Socket.IO:userMessage] 消息被拒绝: 发送者不是普通用户`);
      socket.emit('notification', '只有普通用户可以发送此类型的消息');
      return;
    }

    // 消息基础校验
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      socket.emit('notification', '消息内容不能为空');
      return;
    }
    if (messageContent.length > 10000) {
      socket.emit('notification', '消息长度超过限制（最大10000字符）');
      return;
    }

    try {
      // 构建消息对象
      const now = new Date();
      const userMessage = {
        id: 0,
        senderId: user.id,
        receiverId: ADMIN_ROOM,
        content: messageContent,
        isRead: false,
        toAi,
        timestamp: now
      };

      if (toAi) {
        // AI模式：由Agent Service负责消息持久化，server只负责实时分发
        console.log(`[Socket.IO] AI模式消息，持久化由Agent Service处理`);

        // 发送消息给所有在线管理员和用户自己
        io.to(ADMIN_ROOM.toString()).emit('message', userMessage);
        socket.emit('message', userMessage);

        try {
          // 调用AI流式生成回复函数
          const aiReply = await generateAiReplyStream(messageContent, user.id, socket.id, io);

          if (aiReply) {
            // AI回复已由Agent Service持久化，server只负责分发
            const aiMessage = {
              id: 0,
              senderId: 1000,
              receiverId: user.id,
              content: aiReply,
              isRead: false,
              fromAi: true,
              timestamp: new Date()
            };

            // 发送完整AI回复给用户
            socket.emit('aiMessageComplete', aiMessage);
            io.to(ADMIN_ROOM.toString()).emit('message', aiMessage);

            console.log(`[Socket.IO:userMessage] AI回复已发送给用户 ${user.username}`);
          } else {
            console.log(`[Socket.IO:userMessage] AI回复生成失败，通知用户`);
            socket.emit('notification', 'AI暂时无法回复，请稍后再试');
          }
        } catch (error) {
          console.error('[Socket.IO:userMessage] AI生成回复失败:', error);
          socket.emit('notification', 'AI回复生成失败，请稍后再试');
        }
      } else {
        // 非AI模式：server负责消息持久化
        const message = await PostgresService.saveMessage({
          senderId: user.id,
          receiverId: ADMIN_ROOM,
          content: messageContent,
          isRead: false,
          toAi
        });

        console.log(`[DB] 消息已保存到数据库，ID: ${message.id}`);

        io.to(ADMIN_ROOM.toString()).emit('message', message);
        socket.emit('message', message);
      }
    } catch (error) {
      console.error('[Socket.IO:userMessage] 保存消息失败:', error);
      socket.emit('notification', '消息发送失败');
    }
  });
  
  // 处理管理员消息
  socket.on('adminMessage', async (userId: number, messageContent: string) => {
    const admin = socket.data.user;
    console.log(`[Socket.IO:adminMessage] 收到来自管理员 ${admin?.username || '未知用户'} (ID: ${admin?.id || 'N/A'}) 发送给用户 ${userId} 的消息: "${messageContent}"`);

    if (!admin || admin.type !== '1') {
      console.log(`[Socket.IO:adminMessage] 消息被拒绝: 发送者不是管理员`);
      socket.emit('notification', '只有管理员可以发送此类型的消息');
      return;
    }

    // userId 校验
    if (!Number.isInteger(userId) || userId <= 0) {
      console.log(`[Socket.IO:adminMessage] 消息被拒绝: 无效的目标用户ID ${userId}`);
      socket.emit('notification', '无效的目标用户ID');
      return;
    }

    // 消息基础校验
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      socket.emit('notification', '消息内容不能为空');
      return;
    }
    if (messageContent.length > 10000) {
      socket.emit('notification', '消息长度超过限制（最大10000字符）');
      return;
    }

    try {
      // 检查目标用户是否存在
      const targetUser = await PostgresService.getUserById(userId);
      if (!targetUser) {
        socket.emit('notification', '目标用户不存在');
        return;
      }

      // 保存消息
      const message = await PostgresService.saveMessage({
        senderId: admin.id,
        receiverId: userId,
        content: messageContent,
        isRead: false
      });

      console.log(`[DB] 管理员消息已保存到数据库，ID: ${message.id}`);

      // 发送消息给指定用户
      io.to(userId.toString()).emit('message', message);
      // 也发送给发送消息的管理员自己
      socket.emit('message', message);

      console.log(`[Socket.IO:adminMessage] 管理员消息已发送给用户 ${userId}`);
    } catch (error) {
      console.error('[Socket.IO:adminMessage] 保存消息失败:', error);
      socket.emit('notification', '消息发送失败');
    }
  });

  // AI代管理员回复
  socket.on('aiAdminReply', async (userId: number) => {
    const admin = socket.data.user;
    console.log(`[Socket.IO:aiAdminReply] 管理员 ${admin?.username || '未知用户'} (ID: ${admin?.id || 'N/A'}) 请求AI代回复用户 ${userId}`);

    if (!admin || admin.type !== '1') {
      socket.emit('notification', '只有管理员可以使用AI回复');
      return;
    }

    try {
      // 获取最近对话历史作为上下文
      const messages = await PostgresService.getMessagesBetweenUsers(admin.id, userId);
      const recentMessages = messages.slice(-10);

      if (recentMessages.length === 0) {
        socket.emit('notification', '没有对话历史可供AI参考');
        return;
      }

      // 构建对话上下文
      const contextParts = recentMessages.map(msg => {
        const role = msg.senderId === admin.id ? '管理员' : '用户';
        return `${role}: ${msg.content}`;
      });

      const prompt = `以下是管理员和用户的对话历史。请以管理员的身份，帮管理员草拟一条简洁的回复给用户。只返回回复内容，不要加任何前缀或解释。\n\n对话历史：\n${contextParts.join('\n')}\n\n管理员回复：`;

      // 调用AI生成回复
      const aiReply = await generateAiReply(prompt, admin.id, socket.id, io);

      if (aiReply && aiReply.trim()) {
        // 保存AI回复为管理员消息
        const message = await PostgresService.saveMessage({
          senderId: admin.id,
          receiverId: userId,
          content: aiReply.trim(),
          isRead: false
        });

        console.log(`[Socket.IO:aiAdminReply] AI回复已保存，ID: ${message.id}`);

        // 发送给用户
        io.to(userId.toString()).emit('message', message);
        // 发送给管理员自己
        socket.emit('message', message);
      } else {
        socket.emit('notification', 'AI未能生成回复');
      }
    } catch (error) {
      console.error('[Socket.IO:aiAdminReply] AI回复失败:', error);
      socket.emit('notification', 'AI回复生成失败，请稍后再试');
    }
  });

  // 管理员请求用户的历史消息
  socket.on('requestUserMessages', async (userId: number) => {
    const admin = socket.data.user;
    console.log(`[Socket.IO:requestUserMessages] 管理员 ${admin?.username || '未知用户'} (ID: ${admin?.id || 'N/A'}) 请求用户 ${userId} 的历史消息`);

    if (!admin || admin.type !== '1') {
      console.log(`[Socket.IO:requestUserMessages] 请求被拒绝: 请求者不是管理员`);
      socket.emit('notification', '只有管理员可以请求用户消息');
      return;
    }

    // userId 校验
    if (!Number.isInteger(userId) || userId <= 0) {
      console.log(`[Socket.IO:requestUserMessages] 请求被拒绝: 无效的用户ID ${userId}`);
      socket.emit('notification', '无效的用户ID');
      return;
    }

    try {
      // 查询用户与管理员的历史消息
      const messages = await PostgresService.getAdminUserMessages(userId);
      
      // 发送历史消息给管理员
      socket.emit('userMessages', messages);
      console.log(`[Socket.IO:requestUserMessages] 已发送用户 ${userId} 的 ${messages.length} 条历史消息给管理员`);
    } catch (error) {
      console.error('[Socket.IO:requestUserMessages] 获取历史消息失败:', error);
      socket.emit('notification', '获取历史消息失败');
    }
  });
  
  // 用户断开连接
  socket.on('disconnect', async (reason) => {
    clearTimeout(authTimeout); // 清理认证超时定时器
    const user = socket.data.user;
    console.log(`[Socket.IO:disconnect] 用户 ${socket.id} 已断开连接. 原因: ${reason}`);

    // 清理心跳追踪
    heartbeatMap.delete(socket.id);

    if (user) {
      // 检查该用户是否还有其他活跃连接
      const allSockets = await io.fetchSockets();
      const otherSocketOfSameUser = allSockets.find(
        s => s.id !== socket.id && s.data.user?.id === user.id
      );
      if (!otherSocketOfSameUser) {
        onlineUserIdSet.delete(user.id);
      }

      // 仅当用户无其他活跃连接时才标记离线
      if (!otherSocketOfSameUser) {
        try {
          // 设置用户离线状态
          await PostgresService.setUserOnlineStatus(user.id, false);
          console.log(`[DB] 用户 ${user.username} (ID: ${user.id}) 状态已设置为离线`);

          // 通知管理员用户已离线
          if (user.type === '0') {
            io.to(ADMIN_ROOM.toString()).emit('userDisconnected', user.id);
            console.log(`[Socket.IO:Event] 广播用户离线通知: ${user.username}`);
          }

          // 如果是管理员断开连接，更新用户列表给其他管理员
          if (user.type === '1') {
            const onlineUsers = await PostgresService.getOnlineUsers();
            io.to(ADMIN_ROOM.toString()).emit('userListUpdated', onlineUsers);
            // 广播管理员离线给所有普通用户
            io.emit('adminOnlineStatus', { isOnline: false });
            console.log(`[Socket.IO:Event] 管理员离线，已更新在线用户列表`);
          }
        } catch (error) {
          console.error(`[Socket.IO:disconnect] 设置用户离线状态失败:`, error);
        }

        console.log(`[Socket.IO:disconnect] 用户 ${user.username} (ID: ${user.id}) 已断开连接`);
      } else {
        console.log(`[Socket.IO:disconnect] 用户 ${user.username} (ID: ${user.id}) 有其他活跃连接，保持在线状态`);
      }
    } else {
      console.log(`[Socket.IO:disconnect] 未认证用户 ${socket.id} 已断开连接`);
    }
  });
});

// ========== 心跳巡检：每30s检查僵死连接 ==========
const HEARTBEAT_TIMEOUT_MS = 60000; // 60s 无心跳视为僵死
setInterval(async () => {
  const now = Date.now();
  const allSockets = await io.fetchSockets();
  for (const s of allSockets) {
    if (!s.data.user) continue; // 跳过未认证的 socket
    const lastBeat = heartbeatMap.get(s.id);
    if (!lastBeat || now - lastBeat > HEARTBEAT_TIMEOUT_MS) {
      console.log(`[Heartbeat] 用户 ${s.data.user.username} (ID: ${s.data.user.id}) 心跳超时 (${lastBeat ? Math.round((now - lastBeat) / 1000) : '从未'}秒)，强制断开 socket ${s.id}`);
      s.disconnect(true);
    }
  }
}, 30000);

// ========== 僵死状态清理：每5分钟对账 Blog Server 在线列表 ==========
setInterval(async () => {
  try {
    const blogOnlineUsers = await PostgresService.getOnlineUsers();
    for (const u of blogOnlineUsers) {
      if (!onlineUserIdSet.has(u.id)) {
        console.log(`[StaleCleanup] 用户 ${u.username} (ID: ${u.id}) 在 Blog 中为在线但无活跃连接，修正为离线`);
        await PostgresService.setUserOnlineStatus(u.id, false);
      }
    }
  } catch (error) {
    console.error('[StaleCleanup] 对账任务执行失败:', error);
  }
}, 5 * 60 * 1000);

// 启动服务器
const PORT = process.env.PORT || 4010;
server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`[Server] 服务器正在运行，端口: ${PORT}`);
  console.log(`[Server] Socket.IO 监听路径: ${io.path()}`);
  console.log(`[Server] 请确保Nginx已正确配置代理到此端口`);
  console.log(`========================================`);
});

export default app;