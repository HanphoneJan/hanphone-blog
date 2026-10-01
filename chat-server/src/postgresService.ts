import pg, { Pool, PoolConfig } from 'pg';
import { User, PrivateMessage } from './types.js';
import {
  getUserByUsername as blogGetUserByUsername,
  getUserById as blogGetUserById,
  getAllUsers as blogGetAllUsers,
  getOnlineUsers as blogGetOnlineUsers,
  setUserOnlineStatus as blogSetUserOnlineStatus,
} from './blogApiClient.js';

// PostgreSQL数据库配置（仅用于聊天数据 chat_db）
const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'chat_db',
  password: process.env.DB_PASSWORD,
  port: (() => { const p = Number(process.env.DB_PORT); return isNaN(p) ? 5432 : p; })(),
  max: 20,
  idleTimeoutMillis: 30000,
  // 跨机连接（DB 与服务不在同一台机），超时不宜过长，让重试机制更快介入
  connectionTimeoutMillis: 5000,
  // TCP 保活：防止空闲连接被防火墙/NAT 掐断后仍被复用（Connection terminated unexpectedly）
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// 空闲客户端的后台连接错误：仅记录，避免进程因未处理异常退出
pool.on('error', (err) => {
  console.error('[PG Pool] 客户端连接错误（池会自动重建连接）:', err.message);
});

/**
 * 带重试的查询（最多 3 次，递增间隔）：
 * - 连接类错误（terminated / timeout / ECONNRESET）时池会自动重建连接；
 * - 非连接类错误（SQL/约束等）直接抛出，不重试。
 */
const PG_MAX_ATTEMPTS = 3;

async function queryWithRetry(sql: string, params: unknown[]): Promise<pg.QueryResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PG_MAX_ATTEMPTS; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      const isConnectionError = /connection|terminated|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg);
      if (!isConnectionError || attempt === PG_MAX_ATTEMPTS) throw e;
      console.warn(`[PG] 第 ${attempt} 次查询失败，稍后重试: ${msg}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw lastError;
}

// 初始化数据库（启动时建连检查；schema 结构以仓库根 init.sql 为准）
export const initializeDatabase = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('已连接到消息数据库 (chat_db)');
  } catch (error) {
    console.error('数据库初始化失败（服务继续启动，后续查询将重试）:', error);
  }
};

export const ADMIN_ROOM = 1000;

// PostgreSQL服务类
export class PostgresService {
  // ========== 用户相关方法（通过 Blog API 调用）==========

  static async getUserByUsername(username: string): Promise<User | null> {
    return blogGetUserByUsername(username);
  }

  static async getUserById(userId: number): Promise<User | null> {
    return blogGetUserById(userId);
  }

  static async getAllUsers(): Promise<User[]> {
    return blogGetAllUsers();
  }

  static async getOnlineUsers(): Promise<User[]> {
    return blogGetOnlineUsers();
  }

  static async setUserOnlineStatus(userId: number, isOnline: boolean): Promise<boolean> {
    return blogSetUserOnlineStatus(userId, isOnline);
  }

  /**
   * 获取所有用户及其最新消息时间（管理员专用）
   * 用户数据来自 Blog API，消息时间来自 chat_db.messages
   */
  static async getAllUsersWithLatestMessage(): Promise<(User & { latestMessageTime?: Date })[]> {
    try {
      const users = await blogGetAllUsers();
      const normalUsers = users.filter(u => u.type === '0');

      // 从 chat_db 获取每个用户与管理员对话的最新消息时间
      const result = await pool.query(`
        SELECT
          SUBSTRING(conversation_id FROM 'conv_([0-9]+)_1000')::int AS user_id,
          MAX(timestamp) AS latest_message_time
        FROM messages
        WHERE conversation_id LIKE 'conv_%_1000'
        GROUP BY SUBSTRING(conversation_id FROM 'conv_([0-9]+)_1000')::int
      `);

      const timeMap = new Map<number, Date>();
      for (const row of result.rows) {
        if (row.user_id) {
          timeMap.set(row.user_id, new Date(row.latest_message_time));
        }
      }

      return normalUsers.map(user => ({
        ...user,
        latestMessageTime: timeMap.get(user.id),
      }));
    } catch (error) {
      console.error('获取用户列表及最新消息时间失败:', error);
      throw error;
    }
  }

  // ========== 消息相关方法（chat_db）==========

  /**
   * 确保对话记录存在（在插入消息前调用，满足外键约束）
   */
  static async ensureConversation(conversationId: string, userId: number): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO conversations (conversation_id, user_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (conversation_id) DO NOTHING
      `, [conversationId, userId.toString()]);
    } catch (error) {
      console.error('确保对话记录存在失败:', error);
      throw error;
    }
  }

  static async saveMessage(
    message: Omit<PrivateMessage, 'id' | 'timestamp'>,
    role: 'user' | 'assistant' = 'user'
  ): Promise<PrivateMessage> {
    try {
      const conversationId = `conv_${message.senderId}_${message.receiverId}`;

      // 先确保对话记录存在（messages 有外键引用 conversations）
      await PostgresService.ensureConversation(conversationId, message.senderId);

      const now = new Date();
      const result = await pool.query(`
        INSERT INTO messages (conversation_id, role, content, timestamp)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [conversationId, role, message.content, now]);

      return {
        ...message,
        id: result.rows[0].id,
        timestamp: now,
      };
    } catch (error) {
      console.error('保存消息失败:', error);
      throw error;
    }
  }

  static async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<PrivateMessage[]> {
    try {
      const convId1 = `conv_${userId1}_${userId2}`;
      const convId2 = `conv_${userId2}_${userId1}`;

      const result = await pool.query(`
        SELECT * FROM messages
        WHERE conversation_id = $1 OR conversation_id = $2
        ORDER BY timestamp
      `, [convId1, convId2]);

      return result.rows.map(row => {
        const parts = row.conversation_id.split('_');
        const convSender = parseInt(parts[1], 10);
        const convReceiver = parseInt(parts[2], 10);
        if (isNaN(convSender) || isNaN(convReceiver)) {
          console.error('Invalid conversation_id:', row.conversation_id);
          return null;
        }
        const isAssistant = row.role === 'assistant';
        return {
          id: row.id,
          senderId: isAssistant ? convReceiver : convSender,
          receiverId: isAssistant ? convSender : convReceiver,
          content: row.content,
          timestamp: row.timestamp,
          isRead: row.is_read === true,
          toAi: row.role === 'user' && convReceiver === 1000,
          fromAi: isAssistant,
        };
      }).filter(msg => msg !== null) as PrivateMessage[];
    } catch (error) {
      console.error('查询消息失败:', error);
      throw error;
    }
  }

  static async getAdminUserMessages(userId: number, limit: number = 200): Promise<PrivateMessage[]> {
    try {
      const convId1 = `conv_${userId}_1000`;
      const convId2 = `conv_1000_${userId}`;

      // 只取最近 limit 条（内层 DESC+LIMIT 截断，外层恢复时间正序），防止历史全量膨胀
      const result = await queryWithRetry(`
        SELECT * FROM (
          SELECT * FROM messages
          WHERE conversation_id = $1 OR conversation_id = $2
          ORDER BY timestamp DESC
          LIMIT $3
        ) recent
        ORDER BY timestamp
      `, [convId1, convId2, limit]);

      return result.rows.map(row => {
        const parts = row.conversation_id.split('_');
        const sender = parseInt(parts[1], 10);
        const receiver = parseInt(parts[2], 10);
        if (isNaN(sender) || isNaN(receiver)) {
          console.error('Invalid conversation_id:', row.conversation_id);
          return null;
        }
        const isAssistant = row.role === 'assistant';
        return {
          id: row.id,
          senderId: isAssistant ? receiver : sender,
          receiverId: isAssistant ? sender : receiver,
          content: row.content,
          timestamp: row.timestamp,
          isRead: row.is_read === true,
          toAi: row.role === 'user',
          fromAi: isAssistant,
        };
      }).filter(msg => msg !== null) as PrivateMessage[];
    } catch (error) {
      console.error('查询消息失败:', error);
      throw error;
    }
  }

  static async getMessagesForUser(userId: number, limit: number = 200): Promise<PrivateMessage[]> {
    try {
      const convId1 = `conv_${userId}_${ADMIN_ROOM}`;
      const convId2 = `conv_${ADMIN_ROOM}_${userId}`;

      // 只取最近 limit 条（内层 DESC+LIMIT 截断，外层恢复时间正序），防止历史全量膨胀
      const result = await queryWithRetry(`
        SELECT * FROM (
          SELECT * FROM messages
          WHERE conversation_id = $1 OR conversation_id = $2
          ORDER BY timestamp DESC
          LIMIT $3
        ) recent
        ORDER BY timestamp
      `, [convId1, convId2, limit]);

      return result.rows.map(row => {
        const parts = row.conversation_id.split('_');
        const sender = parseInt(parts[1], 10);
        const receiver = parseInt(parts[2], 10);
        if (isNaN(sender) || isNaN(receiver)) {
          console.error('Invalid conversation_id:', row.conversation_id);
          return null;
        }
        const isAssistant = row.role === 'assistant';
        return {
          id: row.id,
          senderId: isAssistant ? receiver : sender,
          receiverId: isAssistant ? sender : receiver,
          content: row.content,
          timestamp: row.timestamp,
          isRead: row.is_read === true,
          toAi: row.role === 'user',
          fromAi: isAssistant,
        };
      }).filter(msg => msg !== null) as PrivateMessage[];
    } catch (error) {
      console.error('查询消息失败:', error);
      throw error;
    }
  }

  /**
   * 把「peerId 发给 readerId」的消息标记为已读，返回本次已读的最大消息 id（readUpToMessageId）。
   *
   * 方向判定（chat_db.messages 无 sender/receiver 列，方向由 conversation_id + role 决定）：
   * - `conv_{peer}_{reader}` + role='user'        → 发送方=peer，接收方=reader
   * - `conv_{reader}_{peer}` + role='assistant'   → 发送方=peer，接收方=reader
   * 其余组合（reader 发出的消息）不动。
   */
  static async markMessagesAsRead(readerId: number, peerId: number): Promise<number> {
    try {
      const convPeerReader = `conv_${peerId}_${readerId}`;
      const convReaderPeer = `conv_${readerId}_${peerId}`;
      const result = await queryWithRetry(`
        WITH marked AS (
          UPDATE messages SET is_read = TRUE
          WHERE id IN (
            SELECT id FROM messages
            WHERE NOT is_read AND (
              (conversation_id = $1 AND role = 'user')
              OR (conversation_id = $2 AND role = 'assistant')
            )
          )
          RETURNING id
        )
        SELECT COALESCE(MAX(id), 0)::int AS read_up_to FROM marked
      `, [convPeerReader, convReaderPeer]);

      const readUpTo = result.rows[0]?.read_up_to ?? 0;
      if (readUpTo > 0) {
        console.log(`[DB] 用户 ${readerId} 已读与 ${peerId} 的会话，读到消息 ${readUpTo}`);
      }
      return readUpTo;
    } catch (error) {
      console.error('标记消息已读失败:', error);
      throw error;
    }
  }

  /**
   * 管理员收件箱未读数：每个普通用户发给管理员且未读的消息数。
   * 返回 [{ userId, count }]，仅包含有未读消息的用户。
   */
  static async getUnreadCountsForAdmin(): Promise<Array<{ userId: number; count: number }>> {
    try {
      const adminStr = String(ADMIN_ROOM);
      const result = await queryWithRetry(`
        SELECT user_id, count(*)::int AS count FROM (
          SELECT
            CASE
              WHEN role = 'user'      THEN NULLIF(substring(conversation_id FROM ('conv_([0-9]+)_' || $1 || '$')), '')::int
              WHEN role = 'assistant' THEN NULLIF(substring(conversation_id FROM ('conv_' || $1 || '_([0-9]+)$')), '')::int
            END AS user_id
          FROM messages
          WHERE NOT is_read
            AND (
              (role = 'user'      AND conversation_id ~ ('^conv_[0-9]+_' || $1 || '$'))
              OR (role = 'assistant' AND conversation_id ~ ('^conv_' || $1 || '_[0-9]+$'))
            )
        ) t
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY user_id
      `, [adminStr]);

      return result.rows.map(row => ({ userId: row.user_id, count: row.count }));
    } catch (error) {
      console.error('获取未读数失败:', error);
      throw error;
    }
  }

  // ========== 公共聊天室消息方法 ==========

  static async savePublicMessage(msg: {
    user_id: number | null;
    nickname: string;
    avatar: string | null;
    content: string;
    from_ai?: boolean;
  }): Promise<{ id: number; user_id: number | null; nickname: string; avatar: string | null; content: string; from_ai: boolean; timestamp: Date }> {
    try {
      const now = new Date();
      const result = await pool.query(`
        INSERT INTO public_room_messages (user_id, nickname, avatar, content, from_ai, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [msg.user_id, msg.nickname, msg.avatar, msg.content, msg.from_ai ?? false, now]);

      return {
        id: result.rows[0].id,
        user_id: msg.user_id,
        nickname: msg.nickname,
        avatar: msg.avatar,
        content: msg.content,
        from_ai: msg.from_ai ?? false,
        timestamp: now,
      };
    } catch (error) {
      console.error('保存公共聊天消息失败:', error);
      throw error;
    }
  }

  static async getPublicHistory(limit: number = 100): Promise<Array<{
    id: number; user_id: number | null; nickname: string; avatar: string | null; content: string; from_ai: boolean; timestamp: Date;
  }>> {
    try {
      const result = await queryWithRetry(`
        SELECT id, user_id, nickname, avatar, content, from_ai, timestamp
        FROM public_room_messages
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows.reverse().map(row => ({
        ...row,
        from_ai: row.from_ai ?? false,
      }));
    } catch (error) {
      console.error('获取公共聊天历史失败:', error);
      throw error;
    }
  }

  static async deletePublicMessage(messageId: number): Promise<boolean> {
    try {
      const result = await pool.query(`
        DELETE FROM public_room_messages WHERE id = $1
      `, [messageId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('删除公共聊天消息失败:', error);
      throw error;
    }
  }
}

// 关闭数据库连接
async function gracefulShutdown() {
  console.log('正在关闭数据库连接...');
  const timeout = setTimeout(() => {
    console.error('数据库连接关闭超时，强制退出');
    process.exit(1);
  }, 5000);

  try {
    await pool.end();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接时出错:', error);
  } finally {
    clearTimeout(timeout);
    process.exit(0);
  }
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
