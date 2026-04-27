import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => {
    // 处理 token 可能存在的多余双引号
    const rawToken = localStorage.getItem('token');
    let token = rawToken;
    console.log('原始token:', rawToken);
    if (token) {
      // 移除首尾可能存在的双引号（包括普通双引号和可能的全角双引号）
      token = token.replace(/^["“](.*)["”]$/, '$1').trim();
      console.log('处理后的token:', token);
    }

    // 解析用户信息逻辑保持不变
    const userInfoStr = localStorage.getItem('userInfo');
    let userInfo = null;
    try {
      if (userInfoStr) {
        userInfo = JSON.parse(userInfoStr);
      }
    } catch (e) {
      console.error('解析userInfo失败', e);
    }

    return {
      isLoggedIn: !!token, // 基于处理后的token判断登录状态
      username: userInfo?.username || null,
      isAdmin: userInfo?.type === '1',
      token: token, // 使用处理后的token
      userId: userInfo?.id || null,
      nickname: userInfo?.nickname || '',
      email: userInfo?.email || '',
      avatar: userInfo?.avatar || '',
      loginProvince: userInfo?.loginProvince || '',
      loginCity: userInfo?.loginCity || '',
      loginLat: userInfo?.loginLat || '',
      loginLng: userInfo?.loginLng || '',
      type: userInfo?.type || '',
      createTime: userInfo?.createTime || '',
      updateTime: userInfo?.updateTime || '',
      lastLoginTime: userInfo?.lastLoginTime || '',
      expire: userInfo?.expire || '',
      pageName: localStorage.getItem('pageName') || 'index',
      theme: localStorage.getItem('theme') || 'light',
      language: localStorage.getItem('language') || 'zh-cn',
    };
  },
  actions: {
    // 其他方法保持不变...
    changePage(pageName: string) {
      this.pageName = pageName;
      localStorage.setItem('pageName', pageName);
    },
    changeTheme(theme: string) {
      this.theme = theme;
      localStorage.setItem('theme', theme);
    },
    changeLanguage(language: string) {
      this.language = language;
      localStorage.setItem('language', language);
    },
    login(userData: any, token: string, expire: string) {
      this.isLoggedIn = true;
      this.username = userData.username;
      this.isAdmin = userData.type === '1';
      this.token = token;
      this.userId = userData.id;
      this.nickname = userData.nickname || '';
      this.email = userData.email || '';
      this.avatar = userData.avatar || '';
      this.loginProvince = userData.loginProvince || '';
      this.loginCity = userData.loginCity || '';
      this.loginLat = userData.loginLat || '';
      this.loginLng = userData.loginLng || '';
      this.type = userData.type || '';
      this.createTime = userData.createTime || '';
      this.updateTime = userData.updateTime || '';
      this.lastLoginTime = userData.lastLoginTime || '';
      this.expire = expire;
      
      const userInfo = {
        ...JSON.parse(localStorage.getItem('userInfo') || '{}'),
        ...userData
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('token', token); // 存储时使用原始token（无多余引号）
      localStorage.setItem('expire', expire);
    },
    logout() {
      this.isLoggedIn = false;
      this.username = null;
      this.isAdmin = false;
      this.token = null;
      this.userId = null;
      this.nickname = '';
      this.email = '';
      this.avatar = '';
      this.loginProvince = '';
      this.loginCity = '';
      this.loginLat = '';
      this.loginLng = '';
      this.type = '';
      this.createTime = '';
      this.updateTime = '';
      this.lastLoginTime = '';
      this.expire = '';
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      localStorage.removeItem('expire');
    }
  }
});