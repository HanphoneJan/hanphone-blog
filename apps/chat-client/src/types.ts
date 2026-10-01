// 用户类型定义
export interface User {
  id: number;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  type: string; // "0" for regular user, "1" for admin
  createTime: string;
  lastLoginTime: string;
  isOnline?: boolean;
}

// 消息类型定义
export interface Message {
  id: string;
  senderId: number;
  receiverId: number; // 对于管理员消息，这是用户ID；对于用户消息，这是管理员ID (1000)
  content: string;
  timestamp: Date;
  isRead: boolean;
  toAi?: boolean; // 是否发送给AI
  fromAi?: boolean; // 是否来自AI
  userNickname?: string; // 可选字段，用于管理员界面显示消息来源用户昵称
  tempId?: string; // 临时ID，用于乐观更新
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

// Socket.IO事件类型定义
export interface ServerToClientEvents {
  // 服务器向客户端发送的事件
  message: (message: Message) => void;
  notification: (message: string) => void;
  userConnected: (user: User) => void;
  userDisconnected: (userId: number) => void;
  userListUpdated: (users: User[]) => void;
  error: (error: string) => void;
  // AI流式传输相关事件
  aiStreamStart: (data: { tempId: string, senderId: number, receiverId: number, fromAi: boolean }) => void;
  aiStreamChunk: (data: { tempId: string, content: string }) => void;
  aiStreamEnd: (data: { tempId: string, content: string }) => void;
  aiMessageComplete: (message: Message) => void;
}

export interface ClientToServerEvents {
  // 客户端向服务器发送的事件
  authenticate: (token: string) => void;
  userMessage: (message: string, tempId?: string, toAi?: boolean) => void;
  adminMessage: (userId: number, message: string, tempId?: string) => void;
  aiAdminReply: (userId: number) => void;
  heartbeat: () => void;
  disconnect: () => void;
}

// 登录响应类型
export interface LoginResponse {
  flag: boolean;
  data?: {
    token: string;
    user: User;
  };
  message?: string;
}

// 聊天上下文类型
export interface ChatContextType {
  user: User | null;
  token: string | null;
  socket: any | null;
  messages: Message[];
  onlineUsers: User[];
  allUsers: User[]; // 所有用户列表（管理员使用）
  selectedUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  sendMessage: (content: string, toAi?: boolean) => void;
  sendAdminMessage: (userId: number, content: string) => void;
  aiAdminReply: (userId: number) => void;
  selectUser: (user: User) => void;
  selectUserById: (userId: number) => Promise<User | null>; // 通过ID选择用户
  loadHistoryMessages: () => void; // 加载历史消息
  setUserFromLogin: (user: User, token: string) => void; // 直接设置用户信息
  loadAllUsersSorted: () => void; // 加载按最新消息时间排序的用户列表（管理员使用）
}

// 公共聊天上下文类型
export interface PublicChatContextType {
  messages: PublicMessage[];
  onlineCount: number;
  sendPublicMessage: (content: string) => void;
  loadPublicHistory: () => void;
}