<template>
  <div class="brutalist-admin">
    <!-- 装饰性几何元素 -->
    <div class="geo-element geo-1"></div>
    <div class="geo-element geo-2"></div>
    <div class="geo-element geo-3"></div>
    <div class="geo-element geo-4"></div>
    
    <!-- 网格背景 -->
    <div class="grid-background"></div>
    
    <!-- 主容器 -->
    <div class="admin-container">
      <!-- 左侧标题区 -->
      <div class="admin-hero">
        <div class="hero-content">
          <div class="mega-title">
            <span class="char" v-for="(char, i) in 'USERS'" :key="i" :style="{ animationDelay: `${i * 0.1}s` }">
              {{ char }}
            </span>
          </div>
          <div class="hero-subtitle">
            <span class="bracket">[</span>
            管理用户
            <span class="bracket">]</span>
          </div>
          <div class="hero-divider"></div>
          <p class="hero-desc">
            共 {{ total }} 位用户<br>
            分配管理权限
          </p>
        </div>
        
        <!-- 统计信息 -->
        <div class="stats-box">
          <div class="stat-item">
            <span class="stat-number">{{ total }}</span>
            <span class="stat-label">用户总数</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ adminCount }}</span>
            <span class="stat-label">管理员</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ userCount }}</span>
            <span class="stat-label">普通用户</span>
          </div>
        </div>
      </div>
      
      <!-- 右侧内容区 -->
      <div class="admin-content">
        <!-- 操作栏 -->
        <div class="action-bar">
          <div class="search-box">
            <span class="input-label">A.</span>
            <input 
              type="text" 
              v-model="search" 
              @keyup.enter="searchUser"
              placeholder="搜索用户名..."
              class="brutalist-input"
            />
            <button class="icon-btn" @click="searchUser">
              <el-icon><Search /></el-icon>
            </button>
          </div>
        </div>
        
        <!-- 用户列表 -->
        <div class="users-list">
          <div 
            v-for="(user, index) in paginatedUserList" 
            :key="user.username"
            class="user-card"
            :class="{ 'is-admin': user.type === '1', 'is-me': user.username === currentUsername }"
          >
            <!-- 用户编号 -->
            <div class="user-index">{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</div>
            
            <!-- 用户信息 -->
            <div class="user-info">
              <div class="info-row">
                <span class="info-label">用户名</span>
                <span class="info-value">{{ user.username }}</span>
                <span v-if="user.username === currentUsername" class="me-badge">我</span>
              </div>
              <div class="info-row">
                <span class="info-label">邮箱</span>
                <span class="info-value">{{ user.email }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">角色</span>
                <span class="role-badge" :class="user.type === '1' ? 'admin' : 'user'">
                  {{ user.type === '1' ? '管理员' : '普通用户' }}
                </span>
              </div>
            </div>
            
            <!-- 操作区 -->
            <div class="user-actions">
              <!-- 权限切换 -->
              <div class="permission-toggle" v-if="user.username !== currentUsername">
                <span class="toggle-label">管理员</span>
                <button 
                  class="toggle-switch"
                  :class="{ active: user.type === '1' }"
                  @click="toggleUserType(user)"
                >
                  <span class="switch-handle"></span>
                </button>
              </div>
              <div v-else class="self-hint">当前用户</div>
              
              <!-- 删除按钮 -->
              <button 
                class="delete-btn"
                :disabled="user.username === currentUsername"
                @click="deleteUser(user.username)"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </div>
            
            <!-- 装饰性边角 -->
            <div class="corner-tl"></div>
            <div class="corner-br"></div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="pagination" v-if="total > pageSize">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ←
          </button>
          <span class="page-info">
            {{ currentPage }} / {{ Math.ceil(total / pageSize) }}
          </span>
          <button 
            class="page-btn" 
            :disabled="currentPage >= Math.ceil(total / pageSize)"
            @click="currentPage++"
          >
            →
          </button>
        </div>
        
        <!-- 空状态 -->
        <div v-if="paginatedUserList.length === 0" class="empty-state">
          <div class="empty-icon">∅</div>
          <p>暂无用户数据</p>
        </div>
      </div>
    </div>
    
    <!-- 装饰性角落标记 -->
    <div class="corner-mark tl">+</div>
    <div class="corner-mark tr">+</div>
    <div class="corner-mark bl">+</div>
    <div class="corner-mark br">+</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/store';
import api from '@/api/interceptor';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ENDPOINTS } from '@/api/api';
import { Delete, Search } from '@element-plus/icons-vue';

interface User {
  username: string;
  email: string;
  type: string;
}

const userStore = useUserStore();
const currentUsername = userStore.username;

const userList = ref<User[]>([]);
const search = ref('');
const currentPage = ref(1);
const pageSize = ref(8);

// 统计数据
const total = computed(() => filteredUserList.value.length);
const adminCount = computed(() => userList.value.filter(u => u.type === '1').length);
const userCount = computed(() => userList.value.filter(u => u.type !== '1').length);

// 过滤后的用户列表
const filteredUserList = computed(() => {
  if (!search.value) return userList.value;
  const reg = new RegExp(search.value, 'i');
  return userList.value.filter(user => reg.test(user.username) || reg.test(user.email));
});

// 分页后的用户数据
const paginatedUserList = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return filteredUserList.value.slice(startIndex, startIndex + pageSize.value);
});

// 获取用户列表
const getUserList = async () => {
  try {
    const { data: res } = await api.get(ENDPOINTS.GETUSER);
    if (res.status === 830) {
      userList.value = res.data;
    } else {
      ElMessage.error('获取用户信息失败');
    }
  } catch (error) {
    ElMessage.error('请求出错');
  }
};

const searchUser = () => {
  currentPage.value = 1;
};

// 切换用户类型
const toggleUserType = async (user: User) => {
  const newType = user.type === '1' ? '0' : '1';
  const oldType = user.type;
  
  try {
    const { data: res } = await api.post(ENDPOINTS.CHANGEUSER, { 
      user: { ...user, type: newType } 
    });
    
    if (res.status === 830) {
      user.type = newType;
      ElMessage.success(newType === '1' ? '已设为管理员' : '已取消管理员权限');
    } else {
      ElMessage.error('修改失败');
    }
  } catch (error) {
    user.type = oldType;
    ElMessage.error('请求出错');
  }
};

// 删除用户
const deleteUser = async (username: string) => {
  try {
    await ElMessageBox.confirm('此操作将永久删除该用户, 是否继续', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    const { data: res } = await api.post(ENDPOINTS.DELETEUSER, { username });
    if (res.code === 200 || res.status === 830) {
      ElMessage.success('删除成功');
      getUserList();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

onMounted(getUserList);
</script>

<style scoped>
/* 野兽派管理后台 - 用户管理 */
.brutalist-admin {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  background: var(--bg-primary, #f5f5f5);
  position: relative;
  overflow-x: hidden;
  font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
  box-sizing: border-box;
}

/* CSS Variables */
.brutalist-admin {
  --bg-primary: #f5f5f5;
  --bg-secondary: #fff;
  --bg-tertiary: #f0f0f0;
  --text-primary: #0a0a0a;
  --text-secondary: #666;
  --text-muted: #888;
  --border-color: #0a0a0a;
  --accent-color: #00b4d8;
  --admin-color: #ff6b6b;
  --user-color: #4ecdc4;
  --shadow-color: rgba(0,0,0,0.3);
  --grid-line: rgba(0,0,0,0.03);
}

/* Dark theme - 与登录页保持一致 */
html.dark .brutalist-admin {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #2a2a2a;
  --text-primary: #f5f5f5;
  --text-secondary: #ccc;
  --text-muted: #888;
  --border-color: #f5f5f5;
  --accent-color: #00b4d8;
  --admin-color: #ff6b6b;
  --user-color: #4ecdc4;
  --shadow-color: rgba(0,0,0,0.5);
  --grid-line: rgba(255,255,255,0.05);
}

/* 网格背景 */
.grid-background {
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}

/* 装饰性几何元素 */
.geo-element {
  position: fixed;
  pointer-events: none;
  z-index: 0;
}

.geo-1 {
  width: 150px;
  height: 150px;
  border: 4px solid var(--border-color);
  top: 10%;
  left: 5%;
  transform: rotate(15deg);
  opacity: 0.1;
}

.geo-2 {
  width: 0;
  height: 0;
  border-left: 60px solid transparent;
  border-right: 60px solid transparent;
  border-bottom: 100px solid var(--border-color);
  bottom: 15%;
  right: 8%;
  opacity: 0.05;
}

.geo-3 {
  width: 60px;
  height: 60px;
  background: var(--admin-color);
  top: 20%;
  right: 10%;
  opacity: 0.3;
}

.geo-4 {
  width: 100px;
  height: 3px;
  background: var(--border-color);
  bottom: 25%;
  left: 8%;
  transform: rotate(-15deg);
  opacity: 0.2;
}

/* 主容器 */
.admin-container {
  display: flex;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
  max-width: 100vw;
}

/* 左侧标题区 */
.admin-hero {
  width: 320px;
  background: var(--border-color);
  color: var(--bg-secondary);
  padding: 40px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
}

/* 暗黑模式下侧边栏 */
html.dark .admin-hero {
  background: #0a0a0a;
  border-right: 1px solid #333;
}

.hero-content {
  position: relative;
}

.mega-title {
  font-size: 3rem;
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.05em;
  margin-bottom: 20px;
}

.char {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: charReveal 0.5s ease forwards;
}

@keyframes charReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-subtitle {
  font-size: 1rem;
  letter-spacing: 0.3em;
  color: var(--text-muted);
  margin-bottom: 15px;
}

.bracket {
  color: var(--accent-color);
}

.hero-divider {
  width: 50px;
  height: 4px;
  background: var(--accent-color);
  margin: 20px 0;
}

.hero-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-muted);
}

/* 统计信息 */
.stats-box {
  border-top: 2px solid rgba(255,255,255,0.1);
  padding-top: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

/* 右侧内容区 */
.admin-content {
  flex: 1;
  margin-left: 320px;
  padding: 30px;
  background: var(--bg-primary);
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 3px solid var(--border-color);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 400px;
}

.input-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-color);
}

.brutalist-input {
  flex: 1;
  padding: 12px 16px;
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}

.brutalist-input:focus {
  box-shadow: 4px 4px 0 var(--shadow-color);
  transform: translate(-2px, -2px);
}

.brutalist-input::placeholder {
  color: var(--text-muted);
}

.icon-btn {
  width: 45px;
  height: 45px;
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--border-color);
  color: var(--bg-secondary);
}

html.dark .icon-btn:hover {
  background: #f5f5f5;
  color: #0a0a0a;
}

/* 用户列表 */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 用户卡片 */
.user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 25px;
  background: var(--bg-secondary);
  border: 3px solid var(--border-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
  transition: all 0.3s ease;
}

.user-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--shadow-color);
}

.user-card.is-admin {
  border-left: 6px solid var(--admin-color);
}

.user-card.is-me {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(0,180,216,0.1) 100%);
}

/* 用户编号 */
.user-index {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-muted);
  opacity: 0.5;
  min-width: 40px;
}

/* 用户信息 */
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  min-width: 50px;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.me-badge {
  font-size: 0.6rem;
  padding: 2px 8px;
  background: var(--accent-color);
  color: #fff;
  font-weight: 700;
}

.role-badge {
  font-size: 0.7rem;
  padding: 4px 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.role-badge.admin {
  background: var(--admin-color);
  color: #fff;
}

.role-badge.user {
  background: var(--user-color);
  color: #fff;
}

/* 操作区 */
.user-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.permission-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.toggle-switch {
  width: 50px;
  height: 26px;
  border: 2px solid var(--border-color);
  background: var(--bg-tertiary);
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  padding: 0;
}

.toggle-switch.active {
  background: var(--admin-color);
  border-color: var(--admin-color);
}

.switch-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  transition: transform 0.3s ease;
}

.toggle-switch.active .switch-handle {
  transform: translateX(24px);
  border-color: #fff;
}

.self-hint {
  font-size: 0.7rem;
  color: var(--accent-color);
  font-weight: 700;
}

.delete-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-btn:hover:not(:disabled) {
  background: var(--admin-color);
  border-color: var(--admin-color);
  color: #fff;
}

html.dark .delete-btn:hover:not(:disabled) {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: #0a0a0a;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 装饰性边角 */
.corner-tl, .corner-br {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0,0,0,0.15);
}

.corner-tl {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}

.corner-br {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 3px solid var(--border-color);
}

.page-btn {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: var(--border-color);
  color: var(--bg-secondary);
}

html.dark .page-btn:hover:not(:disabled) {
  background: #f5f5f5;
  color: #0a0a0a;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

/* 角落标记 */
.corner-mark {
  position: fixed;
  font-size: 2rem;
  font-weight: 100;
  color: var(--border-color);
  z-index: 2;
  opacity: 0.3;
  pointer-events: none;
}

.corner-mark.tl { top: 20px; left: 340px; }
.corner-mark.tr { top: 20px; right: 20px; }
.corner-mark.bl { bottom: 20px; left: 340px; }
.corner-mark.br { bottom: 20px; right: 20px; }

@media (max-width: 900px) {
  .corner-mark.tl,
  .corner-mark.bl {
    left: 20px;
  }
  
  .corner-mark {
    display: none;
  }
}

/* 响应式 */
@media (max-width: 900px) {
  .admin-hero {
    width: 100%;
    height: auto;
    position: relative;
    padding: 25px 20px;
    box-sizing: border-box;
  }
  
  .mega-title {
    font-size: 2.5rem;
  }
  
  .stats-box {
    display: flex;
    gap: 20px;
    border-top: none;
    border-bottom: 2px solid rgba(255,255,255,0.1);
    padding-top: 0;
    padding-bottom: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 0;
  }
  
  .admin-content {
    margin-left: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .admin-container {
    flex-direction: column;
    width: 100%;
    max-width: 100vw;
  }
  
  .corner-mark.tl,
  .corner-mark.bl {
    left: 20px;
  }
  
  .geo-element {
    display: none;
  }
}

@media (max-width: 700px) {
  .user-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    padding: 15px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .user-info {
    width: 100%;
  }
  
  .info-row {
    flex-wrap: wrap;
  }
  
  .user-actions {
    width: 100%;
    justify-content: space-between;
    border-top: 2px dashed var(--border-color);
    padding-top: 15px;
  }
  
  .user-index {
    position: absolute;
    top: 15px;
    right: 15px;
    font-size: 1.2rem;
  }
}

@media (max-width: 400px) {
  .mega-title {
    font-size: 1.8rem;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
    padding: 15px;
  }
  
  .search-box {
    max-width: none;
    width: 100%;
  }
  
  .brutalist-input {
    width: 100%;
    box-sizing: border-box;
  }
  
  .admin-content {
    padding: 10px;
  }
  
  .user-card {
    padding: 12px;
  }
  
  .pagination {
    gap: 10px;
  }
  
  .page-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
