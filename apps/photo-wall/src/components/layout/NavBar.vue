<template>
  <!-- 汉堡菜单按钮 - 模拟相机快门设计 -->
  <el-button 
    class="hamburger-button" 
    :class="{ 'hamburger-button-hidden': !showHamburger }"
    @click="toggleSidebar" 
    circle
  >
    <el-icon :size="20">
      <Expand v-if="!sidebarOpen" />
      <Fold v-else />
    </el-icon>
  </el-button>
  
  <!-- 侧边栏 - 模拟相机控制面板 -->
  <div class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
    <div class="sidebar-content">
      <!-- 品牌标识 - 摄影工作室风格 -->
      <div class="studio-logo">
        <span class="logo-text">Hanphone</span>
        <span class="logo-subtext">{{ isAdminPage ? 'ADMIN' : 'GALLERY' }}</span>
      </div>
      
      <!-- 顶部区域：搜索框 -->
      <div class="top-section">
        <div class="search-container">
          <el-icon class="search-icon" :size="18">
            <Search />
          </el-icon>
          <el-input
            @focus="checkInput"
            @blur="notSearching()"
            class="search-input"
            :placeholder="isAdminPage ? '搜索内容...' : '搜索照片...'"
            v-model="searchInput"
            @input="searchItems" 
            size="small"
            clearable
          ></el-input>
          
          <!-- 搜索结果 -->
          <ul v-if="!searching && searchList.length" class="search-suggestions">
            <li
              v-for="item in searchList"
              :key="item.id"
              @click="getItemInfo(item.path)"
              class="search-item"
            >
              <span class="item-title">{{ item.title }}</span>
              <span class="item-author">by {{ item.author }}</span>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- 导航菜单 - 统一路由顺序 -->
      <el-menu 
        :default-active="activeIndex" 
        class="sidebar-menu" 
        @select="handleSelect"
        background-color="transparent"
      >
        <!-- 照片墙 - 始终显示 -->
        <el-menu-item index="1">
          <el-icon slot="icon" :size="18">
            <Picture />
          </el-icon>
          照片墙
        </el-menu-item>
        
        <!-- 管理照片 - 始终显示，未登录点击跳转登录页 -->
        <el-menu-item index="2">
          <el-icon slot="icon" :size="18">
            <Setting />
          </el-icon>
          管理照片
        </el-menu-item>
        
        <!-- 管理标签 - 仅管理员显示 -->
        <el-menu-item index="3" v-if="userStore.isAdmin">
          <el-icon slot="icon" :size="18">
            <CollectionTag />
          </el-icon>
          管理标签
        </el-menu-item>
        
        <!-- 管理用户 - 仅管理员显示 -->
        <el-menu-item index="4" v-if="userStore.isAdmin">
          <el-icon slot="icon" :size="18">
            <UserFilled />
          </el-icon>
          管理用户
        </el-menu-item>
        
        <!-- 我的博客 - 始终显示 -->
        <el-menu-item index="5">
          <el-icon slot="icon" :size="18">
            <Document />
          </el-icon>
          我的博客
        </el-menu-item>
      </el-menu>
      
      <!-- 视图切换 - 仅在照片墙页面显示 -->
      <div v-if="isPhotoWallPage" class="view-mode-section">
        <div class="view-mode-header">
          <div class="filter-title">
            <el-icon><View /></el-icon>
            <span>展示方式</span>
          </div>
        </div>
        <div class="view-mode-buttons">
          <el-button 
            class="view-mode-btn" 
            :class="{ 'active': atlasViewMode === 'masonry' }"
            @click="setViewMode('masonry')"
          >
            <el-icon><Grid /></el-icon>
            <span>瀑布流</span>
          </el-button>
          <el-button 
            class="view-mode-btn" 
            :class="{ 'active': atlasViewMode === 'brutalist' }"
            @click="setViewMode('brutalist')"
          >
            <el-icon><Document /></el-icon>
            <span>便利贴</span>
          </el-button>
        </div>
      </div>

      <!-- 标签过滤器 - 仅在照片墙页面显示 -->
      <div v-if="isPhotoWallPage" class="tag-filter-section">
        <div class="tag-filter-header">
          <div class="filter-title">
            <el-icon><Filter /></el-icon>
            <span>筛选标签</span>
          </div>
          <el-button 
            class="toggle-filter-btn" 
            @click="toggleTagFilter" 
            circle
            :class="{ 'active': showTagFilter }"
          >
            <el-icon>
              <ArrowUp v-if="showTagFilter" />
              <ArrowDown v-else />
            </el-icon>
          </el-button>
        </div>
        
        <transition name="slide-down">
          <div v-show="showTagFilter" class="tag-filter">
            <div class="tags-container">
              <el-tag
                v-for="(tag, index) in sortedTags"
                :key="tag.id"
                :type="selectedTags.includes(tag.id) ? 'primary' : 'info'"
                size="default"
                :closable="selectedTags.includes(tag.id)"
                @click="toggleTag(tag.id)"
                @close="handleClose(index)"
                class="tag-item"
                clearable="false"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- 底部功能区 -->
      <div class="sidebar-actions">
        <!-- 未登录状态 -->
        <template v-if="!userStore.isLoggedIn">
          <el-button class="primary-action-button login-button" @click="handleLogin">
            <el-icon :size="16"><User /></el-icon>
            <span>登录</span>
          </el-button>
        </template>
        
        <!-- 已登录状态 -->
        <template v-else>
          <div class="user-section">
            <div class="user-avatar" @click="handleProfile" title="个人中心">
              <img :src="userStore.avatar" alt="用户头像" v-if="userStore.avatar">
              <el-icon v-else><User /></el-icon>
            </div>
            <el-button class="primary-action-button logout-button" @click="handleLogout">
              <el-icon :size="16"><SwitchButton /></el-icon>
              <span>退出</span>
            </el-button>
          </div>
        </template>
        
        <el-button class="theme-toggle-button" @click="toggleTheme" circle title="切换主题">
          <el-icon :size="18">
            <Moon v-if="userStore.theme === 'dark'" />
            <Sunny v-else />
          </el-icon>
        </el-button>
      </div>
    </div>
  </div>
  
  <!-- 遮罩层 -->
  <div class="overlay" :class="{ 'overlay-visible': sidebarOpen }" @click="closeSidebar"></div>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/store';
import api from '@/api/interceptor';
import { ENDPOINTS } from '@/api/api';
import { 
  Expand, Fold, Picture, Document, Setting, 
  User, UserFilled, CollectionTag, SwitchButton, 
  Moon, Sunny, Filter, ArrowUp, ArrowDown, Search,
  View, Grid
} from '@element-plus/icons-vue';

// 标签接口定义
interface Tag {
  id: number | null;
  name: string;
}

interface AtlasItem {
  id: number;
  path: string;
  author: string;
  title: string;
}

const userStore = useUserStore();
const activeIndex = ref('1');
const router = useRouter();
const route = useRoute();
const searching = ref(false);
const searchInput = ref('');
const searchList = ref<AtlasItem[]>([]);
const sidebarOpen = ref(false);

// 标签相关状态（仅前台）
const tagsList = ref<Tag[]>([]);
const selectedTags = ref<number[]>([]);
const showTagFilter = ref(true);

// 判断当前是否在管理后台页面
const isAdminPage = computed(() => route.path.startsWith('/admin'));

// 判断当前是否在照片墙页面
const isPhotoWallPage = computed(() => route.path === '/index' || route.path === '/');

// 照片墙视图模式
const atlasViewMode = ref<'masonry' | 'brutalist'>('brutalist');

// 从 localStorage 读取视图模式
onMounted(() => {
  const savedMode = localStorage.getItem('atlasViewMode') as 'masonry' | 'brutalist';
  if (savedMode) {
    atlasViewMode.value = savedMode;
  }
});

// 设置视图模式
const setViewMode = (mode: 'masonry' | 'brutalist') => {
  atlasViewMode.value = mode;
  localStorage.setItem('atlasViewMode', mode);
  // 触发自定义事件通知 Atlas 组件
  window.dispatchEvent(new CustomEvent('atlas-view-mode-change', { detail: mode }));
  resetInactivityTimer();
};

// 汉堡按钮显示状态
const showHamburger = ref(true);
let inactivityTimer: number | null = null;
const INACTIVITY_TIMEOUT = 3000;

// 重置不活动计时器
const resetInactivityTimer = () => {
  if (inactivityTimer !== null) {
    clearTimeout(inactivityTimer);
  }
  showHamburger.value = true;
  inactivityTimer = window.setTimeout(() => {
    if (!sidebarOpen.value) {
      showHamburger.value = false;
    }
  }, INACTIVITY_TIMEOUT);
};

// 监听用户活动
const handleUserActivity = () => {
  resetInactivityTimer();
};

// 切换侧边栏
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
  if (sidebarOpen.value) {
    showHamburger.value = true;
  }
  resetInactivityTimer();
};

// 关闭侧边栏
const closeSidebar = () => {
  sidebarOpen.value = false;
  resetInactivityTimer();
};

// 监听主题状态变化
watchEffect(() => {
  const htmlClassList = document.documentElement.classList;
  if (userStore.theme === 'dark') {
    htmlClassList.add('dark');
  } else {
    htmlClassList.remove('dark');
  }
});

// 统一路由映射
const routeMap: Record<string, string> = {
  '1': '/index',        // 照片墙
  '2': '/admin/atlas',  // 我的照片/管理照片
  '3': '/admin/tag',    // 管理标签
  '4': '/admin/user',   // 管理用户
  '5': '/blog',         // 我的博客
};

// 需要登录的路由
const authRoutes = ['/admin/atlas', '/admin/tag', '/admin/user'];

// 处理导航选择事件
const handleSelect = (key: string) => {
  const path = routeMap[key];
  if (!path) {
    resetInactivityTimer();
    return;
  }
  
  // 检查是否需要登录
  if (authRoutes.includes(path) && !userStore.isLoggedIn) {
    // 保存目标路径，登录后跳转
    localStorage.setItem('redirectAfterLogin', path);
    router.push('/login');
    closeSidebar();
    resetInactivityTimer();
    return;
  }
  
  const pageName = path.slice(1);
  router.push(path);
  userStore.changePage(pageName);
  closeSidebar();
  resetInactivityTimer();
};

// 处理登录
const handleLogin = () => {
  router.push('/login');
  closeSidebar();
  resetInactivityTimer();
};

// 处理用户资料点击
const handleProfile = () => {
  router.push('/profile');
  closeSidebar();
  resetInactivityTimer();
};

// 处理退出登录
const handleLogout = () => {
  userStore.logout();
  router.push('/index');
  closeSidebar();
  resetInactivityTimer();
};

// 切换主题
const toggleTheme = () => {
  userStore.changeTheme(userStore.theme === 'dark' ? 'light' : 'dark');
  resetInactivityTimer();
};

// 实时搜索
const searchItems = async () => {
  resetInactivityTimer();
  
  if (!searchInput.value.trim()) {
    searchList.value = [];
    searching.value = false;
    return;
  }
  
  searching.value = true;
  try {
    searchList.value = await fetchSearchResults(searchInput.value);
  } catch (error: any) {
    console.error('搜索错误:', error.message);
    searchList.value = [];
  } finally {
    searching.value = false;
  }
};

// 搜索 API 请求
const fetchSearchResults = async (query: string) => {
  try {
    const response = await api.post(ENDPOINTS.SEARCH, { query });
    if (response.data.status === 830) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    return [];
  } catch (error: any) {
    console.error('获取搜索结果失败:', error.message);
    return [];
  }
};

// 获取单个项目详细信息
const getItemInfo = (path: string) => {
  window.location.href = path;
  searching.value = false;
  searchList.value = [];
  closeSidebar();
  resetInactivityTimer();
};

// 处理输入框聚焦
const checkInput = () => {
  searching.value = true;
  resetInactivityTimer();
};

// 处理输入框失去焦点
let timeout: ReturnType<typeof setTimeout>;
const notSearching = () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    searching.value = false;
    searchList.value = [];
  }, 200);
  resetInactivityTimer();
};

// 标签相关方法（仅前台）
const toggleTag = (tagId: number) => {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter((id) => id !== tagId);
  } else {
    selectedTags.value.push(tagId);
  }
  updateUrlTags();
  resetInactivityTimer();
};

const handleClose = (index: number) => {
  selectedTags.value.splice(index, 1);
  updateUrlTags();
  resetInactivityTimer();
};

const toggleTagFilter = () => {
  showTagFilter.value = !showTagFilter.value;
  resetInactivityTimer();
};

const updateUrlTags = () => {
  const currentQuery = { ...route.query };
  if (selectedTags.value.length > 0) {
    currentQuery.tags = selectedTags.value.join(',');
  } else {
    delete currentQuery.tags;
  }
  router.replace({ query: currentQuery });
};

const getTag = async () => {
  try {
    const response = await api.get(ENDPOINTS.GETTAG);
    if (response.data.status === 830) {
      tagsList.value = response.data.data;
    }
  } catch (error: any) {
    console.error('获取标签列表失败:', error.message);
  }
};

// 计算排序后的标签列表
const sortedTags = computed(() => {
  return [
    ...tagsList.value.filter((tag) => selectedTags.value.includes(tag.id!)),
    ...tagsList.value.filter((tag) => !selectedTags.value.includes(tag.id!)),
  ];
});

// 组件挂载时执行
onMounted(async () => {
  if (!isAdminPage.value) {
    await getTag();
    const tagsFromUrl = route.query.tags as string;
    if (tagsFromUrl) {
      selectedTags.value = tagsFromUrl.split(',').map(id => Number(id));
    }
  }
  resetInactivityTimer();
  document.addEventListener('mousemove', handleUserActivity);
  document.addEventListener('keypress', handleUserActivity);
  document.addEventListener('scroll', handleUserActivity);
  document.addEventListener('touchstart', handleUserActivity);
});

// 组件卸载时清理
onUnmounted(() => {
  if (inactivityTimer !== null) {
    clearTimeout(inactivityTimer);
  }
  document.removeEventListener('mousemove', handleUserActivity);
  document.removeEventListener('keypress', handleUserActivity);
  document.removeEventListener('scroll', handleUserActivity);
  document.removeEventListener('touchstart', handleUserActivity);
});
</script>

<style scoped>
/* 基础样式变量 */
:root {
  --photo-primary: #2d3436;
  --photo-secondary: #636e72;
  --photo-accent: #0984e3;
  --photo-light: #dfe6e9;
  --photo-dark: #2d3436;
  --transition-standard: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 汉堡菜单按钮 - 相机快门风格 */
.hamburger-button {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1001;
  width: 44px;
  height: 44px;
  background-color: transparent;
  color: #111827;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  opacity: 1;
  transform: scale(1);
}

.hamburger-button-hidden {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
}

.hamburger-button:hover {
  background-color: var(--photo-accent);
  transform: scale(1.05);
}

/* 侧边栏 - 相机控制面板风格 */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background-color: #f8f9fa;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  z-index: 1000;
  overflow-y: auto;
  box-shadow: 3px 0 15px rgba(0, 0, 0, 0.1);
  opacity: 0;
}

.sidebar-open {
  transform: translateX(0);
  opacity: 1;
}

.sidebar-content {
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
  box-sizing: border-box;
}

/* 工作室标识 */
.studio-logo {
  text-align: center;
  padding: 10px 0 15px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.logo-text {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #1a1a1a;
  font-family: 'Segoe UI', "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
}

.logo-subtext {
  display: block;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #4a4a4a;
  margin-top: 5px;
}

/* 顶部区域 */
.top-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 搜索区域 - 相机镜头风格 */
.search-container {
  position: relative;
  margin: 5px 0;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #4a4a4a;
  z-index: 1;
}

:deep(.search-input .el-input__wrapper) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

:deep(.search-input .el-input__wrapper:focus-within) {
  border: none !important;
  box-shadow: none !important;
}

.search-input {
  padding-left: 40px !important;
  border-radius: 20px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  transition: var(--transition-standard);
  height: 40px;
  color: #1a1a1a;
  font-weight: 500;
}

.search-input:focus {
  background-color: white;
  box-shadow: 0 0 0 1px rgba(9, 132, 227, 0.2);
  border-color: #0984e3;
}

/* 搜索建议 - 胶片风格 */
.search-suggestions {
  list-style: none;
  padding: 10px 0;
  margin: 5px 0 0;
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  box-shadow: 0 5px 5px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  border-radius: 8px;
  background-color: white;
  border: 1px solid #d1d5db;
}

.search-item {
  padding: 12px 15px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: var(--transition-standard);
}

.search-item:hover {
  background-color: #f6f8fa;
  transform: translateX(4px);
}

.item-title {
  font-weight: 500;
  color: #1a1a1a;
}

.item-author {
  font-size: 18px;
  color: #4a4a4a;
  margin-left: auto;
}

/* 视图切换区域 */
.view-mode-section {
  margin: 10px 0;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.view-mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.view-mode-buttons {
  display: flex;
  gap: 8px;
}

.view-mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  border: 2px solid #d1d5db;
  background-color: #ffffff;
  color: #4a4a4a;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
}

.view-mode-btn:hover {
  border-color: #0984e3;
  color: #0984e3;
}

.view-mode-btn.active {
  background-color: #0984e3;
  border-color: #0984e3;
  color: white;
}

.dark .view-mode-section {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.dark .view-mode-btn {
  background-color: #2d3436;
  border-color: #444;
  color: #b2bec3;
}

.dark .view-mode-btn:hover {
  border-color: #74b9ff;
  color: #74b9ff;
}

.dark .view-mode-btn.active {
  background-color: #74b9ff;
  border-color: #74b9ff;
  color: #1a1a1a;
}

/* 标签过滤器区域 */
.tag-filter-section {
  margin: 5px 0;
}

.tag-filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-title {
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 18px;
  color: #1a1a1a;
}

.filter-title .el-icon {
  margin-right: 8px;
  color: #0984e3;
}

.toggle-filter-btn {
  background-color: #f8f9fa;
  border: 1px solid #d1d5db;
  color: #4a4a4a;
  transition: var(--transition-standard);
}

.toggle-filter-btn:hover {
  border-color: #0984e3;
}

.tag-filter {
  padding: 8px 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0;
}

.tag-item {
  cursor: pointer;
  transition: var(--transition-standard);
  font-size: 18px;
  padding: 6px 12px;
  border-radius: 16px;
}

.tag-item:hover {
  transform: scale(1.05);
}

.tag-item.el-tag--primary {
  background-color: rgba(9, 132, 227, 0.1);
  color: #0984e3;
  border: 1px solid #0984e3;
}

.tag-item.el-tag--info {
  background-color: #f1f2f6;
  color: #1a1a1a;
  border: 1px solid #d1d5db;
}

/* 导航菜单 */
.sidebar-menu {
  border: none;
  background-color: transparent;
  flex-grow: 1;
}

.sidebar-menu .el-menu-item {
  height: 50px;
  line-height: 50px;
  font-size: 18px;
  margin: 6px 0;
  border-radius: 6px;
  color: #1a1a1a;
  transition: var(--transition-standard);
  padding-left: 20px !important;
  font-weight: 500;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-menu-item.is-active {
  background-color: rgba(9, 132, 227, 0.1);
  color: #0984e3;
}

/* 底部操作区 */
.sidebar-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  align-items: center;
}

.user-section {
  display: flex;
  gap: 10px;
  flex: 1;
}

.primary-action-button {
  flex-grow: 1;
  font-size: 18px;
  border-radius: 20px;
  border: none;
  height: 40px;
  transition: var(--transition-standard);
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.login-button {
  background-color: #1a1a1a;
  color: white;
}

.login-button:hover {
  background-color: #0984e3;
}

.logout-button {
  background-color: #f44336;
  color: white;
}

.logout-button:hover {
  background-color: #d32f2f;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f2f6;
  border: 1px solid #d1d5db;
  cursor: pointer;
  transition: var(--transition-standard);
  flex-shrink: 0;
}

.user-avatar:hover {
  border-color: #0984e3;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar .el-icon {
  color: #4a4a4a;
  font-size: 20px;
}

.theme-toggle-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ffffff;
  color: #4a4a4a;
  border: 1px solid #d1d5db;
  transition: var(--transition-standard);
  flex-shrink: 0;
}

.theme-toggle-button:hover {
  background-color: #4a4a4a;
  color: white;
}

/* 遮罩层 */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 30%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: var(--transition-standard);
}

.overlay-visible {
  opacity: 1;
  visibility: visible;
}

/* 向下滑动动画 */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to, .slide-down-leave-from {
  max-height: 300px;
  opacity: 1;
}

/* 暗黑主题 - 暗房风格 */
.dark {
  --photo-primary: #f1f2f6;
  --photo-secondary: #b2bec3;
  --photo-accent: #74b9ff;
  --photo-light: #2d3436;
  --photo-dark: #f8f9fa;
}

.dark .sidebar {
  background-color: #1a1a1a;
}

.dark .studio-logo {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.dark .logo-text {
  color: #f1f2f6;
}

.dark .logo-subtext {
  color: #b2bec3;
}

.dark .search-input {
  background-color: #2d3436;
  color: #f1f2f6;
  border-color: #444;
}

.dark .search-input:focus {
  background-color: #2d3436;
  border-color: #74b9ff;
}

.dark .hamburger-button {
  color: #f1f2f6;
}

.dark .search-icon {
  color: #b2bec3;
}

.dark .search-suggestions {
  background-color: #2d3436;
  border-color: #444;
}

.dark .search-item:hover {
  background-color: #393e46;
}

.dark .item-title {
  color: #f1f2f6;
}

.dark .item-author {
  color: #b2bec3;
}

.dark .filter-title {
  color: #f1f2f6;
}

.dark .toggle-filter-btn {
  background-color: #2d3436;
  border-color: #444;
  color: #b2bec3;
}

.dark .toggle-filter-btn:hover {
  border-color: #74b9ff;
  color: #74b9ff;
}

.dark .toggle-filter-btn.active {
  color: #74b9ff;
}

.dark .tag-item.el-tag--primary {
  background-color: rgba(116, 185, 255, 0.1);
  color: #74b9ff;
  border-color: #74b9ff;
}

.dark .tag-item.el-tag--info {
  background-color: #393e46;
  color: #f1f2f6;
  border-color: #444;
}

.dark .sidebar-menu .el-menu-item {
  color: #f1f2f6;
}

.dark .sidebar-menu .el-menu-item:hover,
.dark .sidebar-menu .el-menu-item.is-active {
  background-color: rgba(116, 185, 255, 0.1);
  color: #74b9ff;
}

.dark .sidebar-actions {
  border-top-color: rgba(255, 255, 255, 0.05);
}

.dark .login-button {
  background-color: #2d3436;
  color: #f1f2f6;
}

.dark .login-button:hover {
  background-color: #74b9ff;
}

.dark .logout-button {
  background-color: #c62828;
}

.dark .logout-button:hover {
  background-color: #b71c1c;
}

.dark .user-avatar {
  background-color: #2d3436;
  border-color: #444;
}

.dark .user-avatar:hover {
  border-color: #74b9ff;
}

.dark .user-avatar .el-icon {
  color: #b2bec3;
}

.dark .theme-toggle-button {
  background-color: #2d3436;
  border-color: #444;
  color: #b2bec3;
}

.dark .theme-toggle-button:hover {
  background-color: #b2bec3;
  color: #1a1a1a;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .sidebar {
    width: 85%;
    max-width: 300px;
  }
}
</style>
