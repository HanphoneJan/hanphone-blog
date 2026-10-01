/**
 * Blog API 客户端 — 通过 HTTP 调用 blog server 内部 API 获取用户数据
 *
 * 替代之前的 userPool 直连 blog 数据库方式
 */

import { User } from './types.js';

const BLOG_API_URL = process.env.BLOG_API_URL || 'http://localhost:8090';
const BLOG_INTERNAL_KEY = process.env.BLOG_INTERNAL_KEY || '';

interface BlogApiResponse<T> {
  flag: boolean;
  code: string;
  msg: string;
  data: T;
}

/**
 * 发送 HTTP 请求到 blog server
 */
async function blogApiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const url = `${BLOG_API_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Key': BLOG_INTERNAL_KEY,
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      console.error(`Blog API 请求失败: ${url}, status=${response.status}`);
      return null;
    }

    const result = await response.json() as BlogApiResponse<T>;

    if (!result.flag) {
      console.error(`Blog API 返回错误: ${url}, msg=${result.msg}`);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(`Blog API 请求异常: ${url}, error=${error}`);
    return null;
  }
}

/**
 * 将 blog User 转换为 hanphone-chat User 格式
 */
function convertBlogUser(blogUser: any): User | null {
  if (!blogUser) return null;
  return {
    id: Number(blogUser.id),
    username: blogUser.username || '',
    nickname: blogUser.nickname || '',
    email: blogUser.email || '',
    avatar: blogUser.avatar || '',
    password: '', // 脱敏
    type: blogUser.type?.toString() || '0',
    createTime: blogUser.createTime || '',
    updateTime: blogUser.updateTime || '',
    lastLoginTime: blogUser.lastLoginTime || '',
    loginProvince: blogUser.loginProvince || '',
    loginCity: blogUser.loginCity || '',
    loginLat: Number(blogUser.loginLat) || 0,
    loginLng: Number(blogUser.loginLng) || 0,
    isOnline: blogUser.isOnline || false,
  };
}

/**
 * 根据用户名查询用户
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const data = await blogApiFetch<any>(`/api/user/username/${encodeURIComponent(username)}`);
  return convertBlogUser(data);
}

/**
 * 根据 ID 查询用户（带 60s TTL 进程内缓存）
 *
 * 该函数处于鉴权热路径：每个 REST 请求的 authenticateUser 中间件、
 * 每次 socket authenticate 都会调用。缓存可显著降低对 blog API 的
 * 依赖——blog API 短暂抖动时聊天鉴权/历史仍可用。user.type 等
 * 权限字段最多延迟 60s 生效（可接受）。在线状态不走此函数。
 */
const userCache = new Map<number, { user: User | null; cachedAt: number }>();
const USER_CACHE_TTL_MS = 60_000;
const USER_CACHE_MAX = 1000;

export async function getUserById(userId: number): Promise<User | null> {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }
  const data = await blogApiFetch<any>(`/api/user/${userId}`);
  const user = convertBlogUser(data);
  userCache.set(userId, { user, cachedAt: Date.now() });
  // 简易防膨胀：超限时淘汰最早写入的条目
  if (userCache.size > USER_CACHE_MAX) {
    const oldest = [...userCache.entries()]
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt)
      .slice(0, Math.floor(USER_CACHE_MAX / 5));
    for (const [k] of oldest) userCache.delete(k);
  }
  return user;
}

/**
 * 获取所有用户列表
 */
export async function getAllUsers(): Promise<User[]> {
  const data = await blogApiFetch<any[]>('/api/users');
  if (!data) return [];
  return data.map(convertBlogUser).filter((u): u is User => u !== null);
}

/**
 * 获取在线用户列表
 */
export async function getOnlineUsers(): Promise<User[]> {
  const data = await blogApiFetch<any[]>('/api/users/online');
  if (!data) return [];
  return data.map(convertBlogUser).filter((u): u is User => u !== null);
}

/**
 * 设置用户在线状态
 */
export async function setUserOnlineStatus(userId: number, isOnline: boolean): Promise<boolean> {
  const data = await blogApiFetch<void>(`/api/users/${userId}/online?online=${isOnline}`, {
    method: 'POST',
  });
  return data !== null;
}

/**
 * 获取所有用户及其最新消息时间
 * 注意：此接口需要分别获取用户列表和消息时间，因为 blog server 没有 chat_db 的访问权限
 */
export async function getAllUsersWithLatestMessage(): Promise<(User & { latestMessageTime?: Date })[]> {
  const users = await getAllUsers();
  // 最新消息时间需要从 chat_db 获取，这里直接返回用户列表
  // 在调用方（server.ts）中可以自行补充最新消息时间
  return users.map(u => ({ ...u }));
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${BLOG_API_URL}/api/actuator/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
