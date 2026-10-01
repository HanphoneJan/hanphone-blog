// 用户类型定义
export interface User {
  id: number;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  type: string; // "1" for admin, "0" for regular user
  createTime: string;
  updateTime: string;
  password: string;
  lastLoginTime: string;
  loginProvince: string;
  loginCity: string;
  loginLat: number;
  loginLng: number;
  isOnline: boolean;
}

// 私信消息类型定义
export interface PrivateMessage {
  id: number;
  senderId: number;
  receiverId: number; // 对于管理员消息，这是用户ID；对于用户消息，这是1000
  content: string;
  timestamp: Date;
  isRead: boolean;
  toAi?: boolean; // 是否发送给AI
  fromAi?: boolean; // 是否来自AI
}

// 公共聊天室消息类型
export interface PublicMessage {
  id: number;
  user_id: number | null;
  nickname: string;
  avatar: string | null;
  content: string;
  from_ai: boolean;
  timestamp: Date;
}

// JWT载荷定义
export interface JWTPayload {
  userId: string;  // JWT 解码后默认为字符串，使用时需 parseInt
  username: string;
  type: string; // "1" for admin, "0" for regular user
}

// Socket.IO事件类型定义
export interface ServerToClientEvents {
  // 服务器向客户端发送的事件
  message: (message: PrivateMessage) => void;
  notification: (message: string) => void;
  userConnected: (user: User) => void;
  userDisconnected: (userId: number) => void;
  userListUpdated: (users: User[]) => void;
  userMessages: (messages: PrivateMessage[]) => void; // 管理员请求的历史消息
  error: (error: string) => void;
  aiStatus: (status: { status: 'thinking' | 'generating' | 'completed' | 'error' | null, message: string }) => void;
  // AI流式传输相关事件
  aiStreamStart: (data: { tempId: string, senderId: number, receiverId: number, fromAi: boolean }) => void;
  aiStreamChunk: (data: { tempId: string, content: string }) => void;
  aiStreamEnd: (data: { tempId: string, content: string }) => void;
  aiStreamError: (data: { tempId: string, error: string }) => void;
  aiMessageComplete: (message: PrivateMessage) => void;
  // 公共聊天室事件
  publicHistory: (messages: PublicMessage[]) => void;
  publicMessageBroadcast: (message: PublicMessage) => void;
  publicAiStreamStart: (data: { tempId: string; nickname: string; avatar: string | null }) => void;
  publicAiStreamChunk: (data: { tempId: string; content: string }) => void;
  publicAiStreamEnd: (data: { tempId: string; content: string }) => void;
  publicAiStreamError: (data: { tempId: string; error: string }) => void;
  publicOnlineCount: (data: { count: number }) => void;
  messageDeleted: (data: { messageId: number }) => void;
  adminOnlineStatus: (data: { isOnline: boolean }) => void;
}

export interface ClientToServerEvents {
  // 客户端向服务器发送的事件
  authenticate: (token: string) => void;
  userMessage: (message: string, tempId?: string, toAi?: boolean) => void;
  adminMessage: (userId: number, message: string, tempId?: string) => void;
  aiAdminReply: (userId: number) => void; // 管理员请求AI代回复
  heartbeat: () => void; // 客户端心跳
  requestUserMessages: (userId: number) => void; // 管理员请求用户历史消息
  // 公共聊天室事件
  publicMessage: (content: string, tempId?: string) => void;
  requestPublicHistory: (data?: { limit?: number }) => void;
  adminDeletePublicMessage: (data: { messageId: number }) => void;
  adminMuteUser: (data: { userId: number; durationMinutes: number }) => void;
  adminUnmuteUser: (data: { userId: number }) => void;
  adminMuteAll: (data: { enabled: boolean }) => void;
  disconnect: () => void;
}