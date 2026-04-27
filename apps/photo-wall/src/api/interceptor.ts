import axios from 'axios';

// 创建一个axios实例
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '', // 可以设置基础URL
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器（可选）
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理错误，例如 token 过期等
    if (error.response && error.response.status === 401) {
      // 处理未授权的情况
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;