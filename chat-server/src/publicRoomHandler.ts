import { Server as SocketIOServer, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, PublicMessage } from './types.js';
import { PostgresService } from './postgresService.js';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const AI_AVATAR_URL = process.env.AI_AVATAR_URL || null;
const PUBLIC_ROOM = 'public-room';

// ===== 禁言状态（内存） =====
const mutedUsers = new Map<number, number>(); // userId → 禁言到期时间戳
let isAllMuted = false;

export function isUserMuted(userId: number): boolean {
  if (isAllMuted) return true;
  const until = mutedUsers.get(userId);
  if (until && Date.now() < until) return true;
  if (until && Date.now() >= until) {
    mutedUsers.delete(userId);
  }
  return false;
}

// ===== AI 调用频率限制 =====
const AI_COOLDOWN_MS = 8_000;           // 同一用户两次 AI 调用的最小间隔（8秒）
const AI_RATE_LIMIT_WINDOW_MS = 60_000; // 全局速率限制窗口（1分钟）
const AI_RATE_LIMIT_MAX = 30;            // 每分钟最多 30 次 AI 调用
const lastAiCallTime = new Map<number, number>();     // userId → 上次调用时间戳
const globalAiCallTimestamps: number[] = [];           // 全局调用时间戳队列
let isAiGenerating = false;                             // 当前是否有 AI 正在生成

function canCallAi(userId: number): string | null {
  // 1. 检查是否有 AI 正在生成（全局单并发，避免排队积累）
  if (isAiGenerating) {
    return 'AI正在回复上一条消息，请稍候~';
  }

  // 2. 检查单用户冷却时间
  const lastCall = lastAiCallTime.get(userId);
  if (lastCall) {
    const elapsed = Date.now() - lastCall;
    if (elapsed < AI_COOLDOWN_MS) {
      const remaining = Math.ceil((AI_COOLDOWN_MS - elapsed) / 1000);
      return `请等待 ${remaining} 秒后再@寒枫~`;
    }
  }

  // 3. 检查全局速率限制（滑动窗口）
  const now = Date.now();
  const windowStart = now - AI_RATE_LIMIT_WINDOW_MS;
  // 清理过期时间戳
  while (globalAiCallTimestamps.length > 0 && globalAiCallTimestamps[0] < windowStart) {
    globalAiCallTimestamps.shift();
  }
  if (globalAiCallTimestamps.length >= AI_RATE_LIMIT_MAX) {
    return '寒枫有点忙，请稍后再@寒枫~';
  }

  return null; // 允许调用
}

function recordAiCall(userId: number): void {
  lastAiCallTime.set(userId, Date.now());
  globalAiCallTimestamps.push(Date.now());
}

// ===== 在线人数统计 =====
function getPublicRoomOnlineCount(io: SocketIOServer): number {
  const room = io.sockets.adapter.rooms.get(PUBLIC_ROOM);
  return room ? room.size : 0;
}

function emitOnlineCount(io: SocketIOServer) {
  const count = getPublicRoomOnlineCount(io);
  io.to(PUBLIC_ROOM).emit('publicOnlineCount', { count });
}

// ===== AI 流式回复（公共房间） =====
async function generatePublicAiReply(
  messageContent: string,
  userId: number | null,
  nickname: string,
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
): Promise<string | null> {
  let tempMessageId: string | undefined;

  try {
    console.log(`[PublicAI] 用户 ${nickname} 触发AI流式回复: "${messageContent}"`);

    const streamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (INTERNAL_API_KEY) {
      streamHeaders['X-Internal-Key'] = INTERNAL_API_KEY;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${AGENT_SERVICE_URL}/chat/message/stream`, {
      method: 'POST',
      headers: streamHeaders,
      body: JSON.stringify({
        user_id: userId?.toString() ?? '0',
        conversation_id: 'public_room',
        message: messageContent,
        context: 'public',
        user_info: {
          nickname: nickname,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent Service 返回错误: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!reader) {
      throw new Error('无法获取响应流');
    }

    io.to(PUBLIC_ROOM).emit('publicAiStreamStart', {
      tempId: tempMessageId,
      nickname: '寒枫',
      avatar: AI_AVATAR_URL,
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              fullResponse += parsed.content;
              io.to(PUBLIC_ROOM).emit('publicAiStreamChunk', {
                tempId: tempMessageId,
                content: parsed.content,
              });
            }
          } catch (e) {
            console.error('[PublicAI] 解析SSE数据失败:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    io.to(PUBLIC_ROOM).emit('publicAiStreamEnd', {
      tempId: tempMessageId,
      content: fullResponse,
    });

    console.log(`[PublicAI] AI流式回复完成: "${fullResponse}"`);
    return fullResponse;
  } catch (error) {
    console.error('[PublicAI] AI流式回复失败:', error);
    if (tempMessageId) {
      io.to(PUBLIC_ROOM).emit('publicAiStreamError', {
        tempId: tempMessageId,
        error: 'AI回复生成失败',
      });
    }
    return null;
  }
}

// ===== 主 Handler 注册 =====
export function registerPublicRoomHandler(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 所有连接自动加入 public-room
    socket.join(PUBLIC_ROOM);

    // 连接到来时更新在线人数（延迟等 room 更新）
    setTimeout(() => emitOnlineCount(io), 200);

    // ===== 请求历史消息 =====
    socket.on('requestPublicHistory', async (data) => {
      try {
        const limit = data?.limit ?? 100;
        const messages = await PostgresService.getPublicHistory(limit);
        socket.emit('publicHistory', messages);
      } catch (error) {
        console.error('[PublicRoom] 获取历史消息失败:', error);
        socket.emit('notification', '获取历史消息失败');
      }
    });

    // ===== 发送公共消息 =====
    socket.on('publicMessage', async (content: string, tempId?: string) => {
      console.log(`[PublicRoom] 收到publicMessage: socket=${socket.id}, content="${content?.substring(0, 50)}", tempId=${tempId}`);

      const user = socket.data.user;
      if (!user) {
        console.log(`[PublicRoom] publicMessage被拒绝: socket=${socket.id} 未认证`);
        socket.emit('notification', '请先登录后再发言');
        return;
      }

      // 禁言检查
      if (isUserMuted(user.id)) {
        console.log(`[PublicRoom] publicMessage被拒绝: user=${user.id} 已被禁言`);
        socket.emit('notification', '您已被禁言，暂时无法发言');
        return;
      }

      // 消息校验
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('notification', '消息内容不能为空');
        return;
      }
      if (content.length > 10000) {
        socket.emit('notification', '消息长度超过限制（最大10000字符）');
        return;
      }

      try {
        // 1. 存储并广播用户消息
        console.log(`[PublicRoom] 保存消息: user.id=${user.id}, user.avatar="${user.avatar}", user.nickname="${user.nickname}"`);
        const msg = await PostgresService.savePublicMessage({
          user_id: user.id,
          nickname: user.nickname || user.username,
          avatar: user.avatar || null,
          content: content.trim(),
          from_ai: false,
        });
        console.log(`[PublicRoom] 广播消息: msg.id=${msg.id}, msg.avatar="${msg.avatar}"`);

        io.to(PUBLIC_ROOM).emit('publicMessageBroadcast', msg);

        // 2. 检测 @寒枫 或 @AI/@ai 提及，触发AI回复
        const aiMentionRegex = /@(寒枫|AI|ai)/i;
        if (aiMentionRegex.test(content)) {
          // 频率限制检查
          const rateLimitMsg = canCallAi(user.id);
          if (rateLimitMsg) {
            console.log(`[PublicRoom] AI调用被限流: user=${user.id}, reason="${rateLimitMsg}"`);
            socket.emit('notification', rateLimitMsg);
          } else {
            const cleanedMessage = content.replace(aiMentionRegex, '').trim();
            const aiContent = cleanedMessage || content.trim();

            // 标记 AI 开始生成，记录调用
            isAiGenerating = true;
            recordAiCall(user.id);

            try {
              // 3. 调用AI生成流式回复
              const aiReply = await generatePublicAiReply(aiContent, user.id, user.nickname, io);

              // 4. 如果AI生成成功，保存到数据库并广播
              if (aiReply) {
                const savedAiMsg = await PostgresService.savePublicMessage({
                  user_id: null,
                  nickname: '寒枫',
                  avatar: AI_AVATAR_URL,
                  content: aiReply,
                  from_ai: true,
                });
                io.to(PUBLIC_ROOM).emit('publicMessageBroadcast', savedAiMsg);
              }
            } finally {
              isAiGenerating = false;
            }
          }
        }
      } catch (error) {
        console.error('[PublicRoom] 发送消息失败:', error);
        socket.emit('notification', '消息发送失败');
      }
    });

    // ===== 管理员：删除消息 =====
    socket.on('adminDeletePublicMessage', async (data) => {
      const admin = socket.data.user;
      if (!admin || admin.type !== '1') {
        socket.emit('notification', '只有管理员可以删除消息');
        return;
      }

      try {
        const deleted = await PostgresService.deletePublicMessage(data.messageId);
        if (deleted) {
          io.to(PUBLIC_ROOM).emit('messageDeleted', { messageId: data.messageId });
        }
      } catch (error) {
        console.error('[PublicRoom] 删除消息失败:', error);
        socket.emit('notification', '删除消息失败');
      }
    });

    // ===== 管理员：禁言用户 =====
    socket.on('adminMuteUser', async (data) => {
      const admin = socket.data.user;
      if (!admin || admin.type !== '1') {
        socket.emit('notification', '只有管理员可以禁言用户');
        return;
      }

      const until = Date.now() + data.durationMinutes * 60 * 1000;
      mutedUsers.set(data.userId, until);
      console.log(`[PublicRoom] 管理员 ${admin.username} 禁言用户 ${data.userId} ${data.durationMinutes} 分钟`);
      socket.emit('notification', `已禁言用户 ${data.userId} ${data.durationMinutes} 分钟`);
    });

    // ===== 管理员：解禁用户 =====
    socket.on('adminUnmuteUser', async (data) => {
      const admin = socket.data.user;
      if (!admin || admin.type !== '1') {
        socket.emit('notification', '只有管理员可以解禁用户');
        return;
      }

      mutedUsers.delete(data.userId);
      console.log(`[PublicRoom] 管理员 ${admin.username} 解禁用户 ${data.userId}`);
      socket.emit('notification', `已解禁用户 ${data.userId}`);
    });

    // ===== 管理员：全员禁言 =====
    socket.on('adminMuteAll', async (data) => {
      const admin = socket.data.user;
      if (!admin || admin.type !== '1') {
        socket.emit('notification', '只有管理员可以设置全员禁言');
        return;
      }

      isAllMuted = data.enabled;
      console.log(`[PublicRoom] 管理员 ${admin.username} 设置全员禁言: ${isAllMuted}`);
      io.to(PUBLIC_ROOM).emit('notification', isAllMuted ? '管理员已开启全员禁言' : '管理员已关闭全员禁言');
    });

    // ===== 断开连接时更新在线人数 =====
    socket.on('disconnect', () => {
      setTimeout(() => emitOnlineCount(io), 500);
    });
  });
}
