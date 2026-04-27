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
            <span class="char" v-for="(char, i) in 'TAGS'" :key="i" :style="{ animationDelay: `${i * 0.1}s` }">
              {{ char }}
            </span>
          </div>
          <div class="hero-subtitle">
            <span class="bracket">[</span>
            管理标签
            <span class="bracket">]</span>
          </div>
          <div class="hero-divider"></div>
          <p class="hero-desc">
            共 {{ tagList.length }} 个标签<br>
            管理照片分类
          </p>
        </div>
        
        <!-- 统计信息 -->
        <div class="stats-box">
          <div class="stat-item">
            <span class="stat-number">{{ tagList.length }}</span>
            <span class="stat-label">标签总数</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ totalPhotos }}</span>
            <span class="stat-label">照片总数</span>
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
              @keyup.enter="searchTags"
              placeholder="搜索标签..."
              class="brutalist-input"
            />
            <button class="icon-btn" @click="searchTags">
              <el-icon><Search /></el-icon>
            </button>
          </div>
          <button class="brutalist-btn primary" @click="openCreateDialog">
            <span class="btn-icon">+</span>
            <span class="btn-text">新建标签</span>
          </button>
        </div>
        
        <!-- 标签网格 -->
        <div class="tags-grid">
          <div 
            v-for="(tag, index) in filteredTagList" 
            :key="tag.id"
            class="tag-card"
            :class="`color-${index % 8}`"
          >
            <!-- 胶带效果 -->
            <div class="tape"></div>
            
            <div class="tag-header">
              <span class="tag-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="tag-actions">
                <button class="action-btn edit" @click="editTagById(tag.id)">
                  <el-icon><Edit /></el-icon>
                </button>
                <button class="action-btn delete" @click="deleteTagById(tag.id)">
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </div>
            
            <div class="tag-body">
              <h3 class="tag-name">{{ tag.name }}</h3>
              <div class="tag-meta">
                <span class="meta-item">
                  <span class="meta-label">照片:</span>
                  <span class="meta-value">{{ tag.number || 0 }}</span>
                </span>
              </div>
            </div>
            
            <!-- 装饰性边角 -->
            <div class="corner-tl"></div>
            <div class="corner-br"></div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="filteredTagList.length === 0" class="empty-state">
          <div class="empty-icon">∅</div>
          <p>暂无标签数据</p>
        </div>
      </div>
    </div>
    
    <!-- 新建/编辑对话框 -->
    <div v-if="dialogVisible" class="brutalist-modal" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-number">01</span>
          <h3 class="modal-title">{{ isEditing ? '// 编辑标签' : '// 新建标签' }}</h3>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              <span class="label-index">A.</span>
              标签名称
            </label>
            <input 
              type="text" 
              v-model="form.name"
              @keyup.enter="submitForm"
              placeholder="输入标签名称"
              class="brutalist-input"
              ref="nameInput"
            />
            <p v-if="formError" class="error-text">{{ formError }}</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="brutalist-btn" @click="closeDialog">取消</button>
          <button class="brutalist-btn primary" @click="submitForm">
            <span class="btn-text">确认</span>
            <span class="btn-arrow">→</span>
          </button>
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
import { ref, onMounted, computed, nextTick } from 'vue';
import api from '@/api/interceptor';
import { ENDPOINTS } from '@/api/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Search } from '@element-plus/icons-vue';

interface Tag {
  id: number;
  name: string;
  number: number;
}

const tagList = ref<Tag[]>([]);
const search = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const form = ref({ name: '', id: null as number | null });
const formError = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

// 计算总照片数
const totalPhotos = computed(() => {
  return tagList.value.reduce((sum, tag) => sum + (tag.number || 0), 0);
});

// 过滤后的标签列表
const filteredTagList = computed(() => {
  if (!search.value) return tagList.value;
  const searchValue = search.value.toLowerCase();
  return tagList.value.filter(tag => tag.name.toLowerCase().includes(searchValue));
});

// 获取标签列表
const getFullTagList = async () => {
  try {
    const { data: res } = await api.get(ENDPOINTS.GETADMINTAG);
    if (res.status === 830) {
      tagList.value = res.data;
    } else {
      ElMessage.error('标签列表加载失败');
    }
  } catch (error) {
    console.error('获取标签列表失败:', error);
    ElMessage.error('获取标签列表失败');
  }
};

const searchTags = () => {
  // 过滤逻辑由 computed 属性自动处理
};

const openCreateDialog = () => {
  isEditing.value = false;
  form.value = { name: '', id: null };
  formError.value = '';
  dialogVisible.value = true;
  nextTick(() => {
    nameInput.value?.focus();
  });
};

const editTagById = (id: number) => {
  const tag = tagList.value.find(t => t.id === id);
  if (tag) {
    isEditing.value = true;
    form.value = { name: tag.name, id: tag.id };
    formError.value = '';
    dialogVisible.value = true;
    nextTick(() => {
      nameInput.value?.focus();
    });
  }
};

const closeDialog = () => {
  dialogVisible.value = false;
  form.value = { name: '', id: null };
  formError.value = '';
};

const submitForm = async () => {
  if (!form.value.name.trim()) {
    formError.value = '标签名称不能为空';
    return;
  }
  
  try {
    const endpoint = isEditing.value ? ENDPOINTS.CREATETAG : ENDPOINTS.CREATETAG;
    const { data: res } = await api.post(endpoint, { 
      tag: { id: form.value.id, name: form.value.name.trim() } 
    });
    
    if (res.status === 830) {
      ElMessage.success(isEditing.value ? '修改成功' : '创建成功');
      closeDialog();
      await getFullTagList();
    } else {
      formError.value = res.message || '操作失败';
    }
  } catch (error: any) {
    formError.value = error.response?.data?.message || '操作失败';
  }
};

const deleteTagById = async (tagId: number) => {
  try {
    await ElMessageBox.confirm('此操作将永久删除该标签, 是否继续', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    const { data: res } = await api.post(ENDPOINTS.DELETETAG, { tagId });
    if (res.status === 830) {
      ElMessage.success('删除成功');
      await getFullTagList();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

onMounted(getFullTagList);
</script>

<style scoped>
/* 野兽派管理后台 - 标签管理 */
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
  background: var(--accent-color);
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
  font-size: 3.5rem;
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
  margin-bottom: 10px;
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
  margin-bottom: 30px;
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

/* 按钮样式 */
.brutalist-btn {
  padding: 12px 24px;
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.brutalist-btn:hover {
  background: var(--border-color);
  color: var(--bg-secondary);
  transform: translate(2px, 2px);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

html.dark .brutalist-btn:hover {
  background: #f5f5f5;
  color: #0a0a0a;
}

.brutalist-btn.primary {
  background: var(--border-color);
  color: var(--bg-secondary);
}

.brutalist-btn.primary:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.btn-icon {
  font-size: 1.2rem;
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.brutalist-btn:hover .btn-arrow {
  transform: translateX(5px);
}

/* 标签网格 */
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

/* 标签卡片 - 便利贴风格 */
.tag-card {
  position: relative;
  padding: 20px;
  min-height: 140px;
  box-shadow: 4px 4px 0 var(--shadow-color);
  transition: all 0.3s ease;
}

.tag-card:hover {
  transform: translate(-3px, -3px) rotate(-1deg);
  box-shadow: 8px 8px 0 var(--shadow-color);
}

/* 便利贴颜色 */
.tag-card.color-0 { background: #ff6b6b; }
.tag-card.color-1 { background: #4ecdc4; }
.tag-card.color-2 { background: #ffe066; }
.tag-card.color-3 { background: #74c0fc; }
.tag-card.color-4 { background: #ff9ff3; }
.tag-card.color-5 { background: #54a0ff; }
.tag-card.color-6 { background: #5f27cd; color: #fff; }
.tag-card.color-7 { background: #00d2d3; }

/* 暗黑模式下的便利贴颜色 - 降低饱和度 */
html.dark .tag-card.color-0 { background: #8b5a5a; }
html.dark .tag-card.color-1 { background: #5a8b7a; }
html.dark .tag-card.color-2 { background: #8b7d5a; }
html.dark .tag-card.color-3 { background: #5a6b8b; }
html.dark .tag-card.color-4 { background: #7a5a8b; }
html.dark .tag-card.color-5 { background: #5a7a8b; }
html.dark .tag-card.color-6 { background: #4a4a6a; color: #e0e0e0; }
html.dark .tag-card.color-7 { background: #5a8b8b; }

/* 胶带效果 */
.tape {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 20px;
  background: rgba(255,255,255,0.4);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tag-index {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.6;
}

.tag-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(0,0,0,0.3);
  background: rgba(255,255,255,0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255,255,255,0.8);
  transform: scale(1.1);
}

.action-btn.delete:hover {
  background: #ff4757;
  border-color: #ff4757;
  color: #fff;
}

.tag-body {
  position: relative;
}

.tag-name {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  word-break: break-all;
}

.tag-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  font-size: 0.8rem;
}

.meta-label {
  opacity: 0.7;
}

.meta-value {
  font-weight: 700;
}

/* 装饰性边角 */
.corner-tl, .corner-br {
  position: absolute;
  width: 15px;
  height: 15px;
  border: 2px solid rgba(0,0,0,0.2);
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

/* 对话框 */
.brutalist-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-secondary);
  border: 4px solid var(--border-color);
  width: 100%;
  max-width: 450px;
  box-shadow: 12px 12px 0 var(--shadow-color);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-bottom: 3px solid var(--border-color);
  position: relative;
}

.modal-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-color);
  border: 2px solid var(--accent-color);
  padding: 4px 10px;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #ff4757;
  border-color: #ff4757;
  color: #fff;
}

.modal-body {
  padding: 25px 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-index {
  color: var(--accent-color);
}

.error-text {
  color: #ff4757;
  font-size: 0.8rem;
  margin: 5px 0 0 0;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 3px solid var(--border-color);
  justify-content: flex-end;
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
    gap: 30px;
    border-top: none;
    border-bottom: 2px solid rgba(255,255,255,0.1);
    padding-top: 0;
    padding-bottom: 20px;
    margin-bottom: 20px;
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

@media (max-width: 600px) {
  .tags-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  
  .tag-card {
    min-height: 120px;
    padding: 15px;
  }
  
  .tag-name {
    font-size: 1.1rem;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .search-box {
    max-width: none;
    width: 100%;
  }
  
  .brutalist-input {
    width: 100%;
    box-sizing: border-box;
  }
  
  .mega-title {
    font-size: 2rem;
  }
  
  .admin-content {
    padding: 15px;
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 400px) {
  .tags-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .tag-card {
    padding: 12px;
    min-height: 100px;
  }
  
  .mega-title {
    font-size: 1.8rem;
  }
  
  .admin-content {
    padding: 10px;
  }
  
  .action-bar {
    padding: 15px;
  }
  
  .modal-content {
    max-width: 100%;
    margin: 10px;
  }
  
  .brutalist-modal {
    padding: 10px;
  }
}
</style>
