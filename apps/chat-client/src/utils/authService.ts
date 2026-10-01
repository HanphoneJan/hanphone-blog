import axios from 'axios';
import { LoginResponse } from '../types';
import {
  API_ENDPOINTS,
  getIdEndpoint,
  getAuthHeaders,
  ERROR_MESSAGES
} from '../config/api';

// 认证服务
export const authService = {
  // 用户登录
  async login(username: string, passwordmd5: string, extraInfo?: any): Promise<LoginResponse> {
    try {
      const response = await axios.post(API_ENDPOINTS.LOGIN, {
        username,
        password: passwordmd5,
        ...extraInfo
      });
      return response.data;
    } catch (error) {
      console.error('登录请求失败:', error);
      return { flag: false, message: ERROR_MESSAGES.LOGIN_FAILED };
    }
  },

  // 获取在线用户列表（仅管理员可用）
  async getOnlineUsers(token: string) {
    try {
      const response = await axios.get(API_ENDPOINTS.USERS, {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_USERS_FAILED };
    }
  },

  // 获取所有用户列表（管理员专用）
  async getAllUsers(token: string) {
    try {
      const response = await axios.get(API_ENDPOINTS.ALL_USERS, {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取所有用户列表失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_ALL_USERS_FAILED };
    }
  },

  // 获取按最新消息时间排序的用户列表（管理员专用）
  async getUsersSortedByLatestMessage(token: string) {
    try {
      const response = await axios.get(API_ENDPOINTS.USERS_SORTED, {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取排序用户列表失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_SORTED_USERS_FAILED };
    }
  },

  // 获取与管理员的聊天记录（普通用户使用）
  async getMessagesWithAdmin(token: string) {
    try {
      const response = await axios.get(API_ENDPOINTS.MESSAGES_ADMIN, {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取聊天记录失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_MESSAGES_FAILED };
    }
  },

  // 获取与特定用户的聊天记录（管理员使用）
  async getMessagesWithUser(userId: number, token: string) {
    try {
      const response = await axios.get(getIdEndpoint(API_ENDPOINTS.MESSAGES_USER_BASE, userId), {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取聊天记录失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_MESSAGES_FAILED };
    }
  },

  // 获取管理员用户信息（userId=1000）
  async getAdminUserInfo(token: string) {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_USER_INFO, {
        headers: getAuthHeaders(token),
      });
      return response.data;
    } catch (error) {
      console.error('获取管理员信息失败:', error);
      return { success: false, message: ERROR_MESSAGES.GET_ADMIN_INFO_FAILED };
    }
  },

  // 获取公共聊天历史
  async getPublicHistory(token: string | null, limit: number = 100) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await axios.get(
        `${API_ENDPOINTS.PUBLIC_HISTORY}?limit=${limit}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('获取公共聊天历史失败:', error);
      return { success: false, message: '获取公共聊天历史失败' };
    }
  },
};

export default authService;