import axios from 'axios';
import { TIME, STORAGE_KEYS } from './constants';

// 创建 Axios 实例
const apiClient = axios.create({
  timeout: TIME.API_TIMEOUT
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 仅在浏览器环境下执行
    if (typeof window !== 'undefined') {
      // 从 localStorage 获取 token（可能为 JSON 字符串）
      const tokenRaw = localStorage.getItem(STORAGE_KEYS.TOKEN);
      let token: string | null = null;
      if (tokenRaw) {
        try {
          token = JSON.parse(tokenRaw);
        } catch {
          token = tokenRaw;
        }
      }
      if (token) {
        config.headers.Token = `${token}`;
      }
    }
    return config;
  },
  (error) => {
    // 处理请求错误
    return Promise.reject(error);
  }
);

// 响应拦截器（处理 token 过期等情况）
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 未授权：清除无效凭证；仅后台路径跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER_INFO)
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
);

export default apiClient;
