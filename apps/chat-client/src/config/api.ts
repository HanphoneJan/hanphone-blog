// API配置文件

// 基础 URL 定义
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL;
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Socket.IO配置
export const SOCKET_CONFIG = {
  url: import.meta.env.VITE_SOCKET_URL,
  path: '/chat-api/socket.io', // 完整的服务器端点
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

// API端点 (统一暴露完整 URL)
export const API_ENDPOINTS = {
  // 认证相关 (登录去博客后端)
  LOGIN: `${AUTH_BASE}/api/login`,

  // 业务相关 (去聊天后端)
  USERS: `${API_BASE}/api/users`,
  ALL_USERS: `${API_BASE}/api/users/all`,
  USERS_SORTED: `${API_BASE}/api/users/sorted`,
  MESSAGES_ADMIN: `${API_BASE}/api/messages/admin`,
  ADMIN_USER_INFO: `${API_BASE}/api/user/admin`,
  MESSAGES_USER_BASE: `${API_BASE}/api/messages`, // 用于拼接 ID 的基础路径
  PUBLIC_HISTORY: `${API_BASE}/api/public/history`,
  USERS_UNREAD: `${API_BASE}/api/users/unread`, // 管理员收件箱未读数
};

// 获取带有ID的端点
export const getIdEndpoint = (baseEndpoint: string, id: number | string) => {
  return `${baseEndpoint}/${id}`;
};

// 请求头生成函数
export const getAuthHeaders = (token: string) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 错误消息
export const ERROR_MESSAGES = {
  LOGIN_FAILED: '登录请求失败，请检查网络连接',
  GET_USERS_FAILED: '获取用户列表失败',
  GET_ALL_USERS_FAILED: '获取所有用户列表失败',
  GET_SORTED_USERS_FAILED: '获取排序用户列表失败',
  GET_MESSAGES_FAILED: '获取聊天记录失败',
  GET_ADMIN_INFO_FAILED: '获取管理员信息失败'
};