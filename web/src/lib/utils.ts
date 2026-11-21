import axios from 'axios';
import { TIME, STORAGE_KEYS } from './constants';
import { clearLocalAuth, refreshAccessToken } from './authApi';

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

// 响应拦截器：401 先用 refresh 静默续期并重放一次；续期失败才清凭证
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const config = error.config as (typeof error.config & { _authRetry?: boolean }) | undefined
    const url = String(config?.url || '')

    if (status === 401 && config && !config._authRetry && !url.includes('/login') && !url.includes('/auth/')) {
      config._authRetry = true
      const token = await refreshAccessToken()
      if (token) {
        // 单飞刷新成功后重放原请求（请求拦截器会带上新 token）
        return apiClient(config)
      }
    }

    if (status === 401) {
      clearLocalAuth()
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
);

export default apiClient;

/** 判断请求错误是否为 401（轮询类请求遇到 401 应停止，避免无休止重试） */
export function isUnauthorizedError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
  return status === 401;
}
