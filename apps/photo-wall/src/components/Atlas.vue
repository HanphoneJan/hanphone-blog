<template>
  <!-- 欢迎页面内容 -->
  <transition name="slide-left" mode="out-in">
    <div v-if="showWelcome" key="welcome-page" class="welcome-container">
      <el-row style="height: 100vh" class="welcome-row">
        <el-col :span="24" style="height: 100%">
          <el-card shadow="hover" class="welcome">
            <h1 class="tit">
              {{ welcomeTitle }}
              <div class="border"></div>
            </h1>
            <h2 class="intro">{{ intro }}</h2>
            <div class="bounce down" @click="handleClick">
              <el-icon style="color:white;"><ArrowRightBold /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </transition>

  <!-- 瀑布流布局 -->
  <div v-if="viewMode === 'masonry'" class="atlas-container" id="atlas-container">
    <div class="masonry-columns">
      <div
        v-for="item in filteredAtlasData"
        :key="item.id"
        class="grid-item"
      >
        <el-card :body-style="{ padding: '0px' }" class="photo-card">
          <div class="photo-wrapper">
            <el-image
              :src="item.path"
              class="image"
              lazy
              ref="imageRef"
            />
            <div class="photo-overlay">
              <div class="photo-info-overlay">
                <div class="title-author-row">
                  <div class="photo-title">{{ item.title }}</div>
                  <div class="photo-author">@{{ item.author }}</div>
                </div>
                <div class="photo-description">{{ item.description }}</div>
                <div class="tags-actions-row">
                  <div class="photo-tags">
                    <el-tag
                      v-for="tag in item.tags"
                      :key="tag.id"
                      size="small"
                      type="info"
                      class="photo-tag"
                    >
                      #{{ tag.name }}
                    </el-tag>
                  </div>
                  <div class="photo-actions">
                    <el-icon class="action-icon" @click="zoomImage(item)">
                      <ZoomIn :style="{ color: 'white' }" />
                    </el-icon>
                    <el-icon class="action-icon" @click="downloadImage(item)">
                      <Download :style="{ color: 'white' }" />
                    </el-icon>
                    <el-icon class="action-icon" @click.stop="handleLikes(item, $event)">
                      <StarFilled v-if="item.isLiked" :style="{ color: 'yellow' }" />
                      <Star v-else :style="{ color: 'white' }" />
                    </el-icon>
                    <span class="likes-count">{{ item.likes }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>

  <!-- 野兽派便利贴布局 -->
  <div v-else class="brutalist-container">
    <!-- 网格背景 -->
    <div class="grid-background"></div>
    
    <!-- 装饰性几何元素 -->
    <div class="geo-element geo-1"></div>
    <div class="geo-element geo-2"></div>
    <div class="geo-element geo-3"></div>
    <div class="geo-element geo-4"></div>
    <div class="geo-element geo-5"></div>
    <div class="geo-element geo-6"></div>
    
    <!-- 便利贴区域 -->
    <div class="sticky-notes-area">
      <div
        v-for="(item, index) in filteredAtlasData"
        :key="item.id"
        class="sticky-note"
        :class="getNoteClass(index)"
        :style="getNoteStyle(index)"
      >
        <!-- 胶带效果 -->
        <div class="tape"></div>
        
        <!-- 照片 -->
        <div class="note-image-wrapper">
          <el-image
            :src="item.path"
            class="note-image"
            lazy
            @click="zoomImage(item)"
          />
        </div>
        
        <!-- 内容区 -->
        <div class="note-content">
          <div class="note-header">
            <span class="note-number">{{ String(index + 1).padStart(3, '0') }}</span>
            <span class="note-date">{{ formatDate(item.upload_time) }}</span>
          </div>
          
          <h3 class="note-title">{{ item.title }}</h3>
          <p class="note-author">@{{ item.author }}</p>
          <p class="note-description">{{ item.description }}</p>
          
          <div class="note-tags">
            <span
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag.id"
              class="note-tag"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="note-actions">
          <button class="brutalist-btn small" @click="zoomImage(item)">
            <el-icon><ZoomIn /></el-icon>
          </button>
          <button class="brutalist-btn small" @click="downloadImage(item)">
            <el-icon><Download /></el-icon>
          </button>
          <button 
            class="brutalist-btn small like-btn" 
            :class="{ 'is-liked': item.isLiked }"
            @click.stop="handleLikes(item, $event)"
          >
            <el-icon><StarFilled v-if="item.isLiked" /><Star v-else /></el-icon>
            <span class="like-count">{{ item.likes }}</span>
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
import { ref, onMounted, onUnmounted, computed, watchEffect, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '@/api/interceptor';
import { ENDPOINTS } from '@/api/api';
import { useUserStore } from '@/store/store';
import { ArrowRightBold, Star, StarFilled, ZoomIn, Download } from '@element-plus/icons-vue';

interface Tag {
  id: number | null;
  name: string;
}

interface AtlasItem {
  id: number;
  path: string;
  author: string;
  title: string;
  description: string;
  likes: number;
  type: number;
  upload_time: string;
  isLiked: boolean;
  tags: Tag[];
  username: string;
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const tagsList = ref<Tag[]>([]);
const atlasData = ref<AtlasItem[]>([]);
const sortedAtlasData = ref<AtlasItem[]>([]);
const selectedTags = ref<number[]>([]);
const showWelcome = ref(true);
const imageRefs = ref<(HTMLElement | null)[]>([]);
let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
const intro = ref('生活の瞬間を捉え、感動を記録する');
const welcomeTitle = ref('寒楓のフォトギャラリー');

// 视图模式：masonry(瀑布流) | brutalist(野兽派便利贴)
const viewMode = ref<'masonry' | 'brutalist'>('brutalist');

// 便利贴颜色配置
const noteColors = [
  { bg: '#ff6b6b', border: '#c92a2a' },
  { bg: '#4ecdc4', border: '#087f5b' },
  { bg: '#ffe066', border: '#f08c00' },
  { bg: '#74c0fc', border: '#1864ab' },
  { bg: '#ff9ff3', border: '#be4bdb' },
  { bg: '#54a0ff', border: '#1c7ed6' },
  { bg: '#5f27cd', border: '#341f97' },
  { bg: '#00d2d3', border: '#01a3a4' },
];

onMounted(async () => {
  const bgImage = new Image();
  bgImage.src = 'https://hanphone.top/blog/atlas/background.jpeg';
  
  getTag();
  atlasShow();
  startReadTimeout();
  
  // 从 localStorage 读取视图模式
  const savedMode = localStorage.getItem('atlasViewMode') as 'masonry' | 'brutalist';
  if (savedMode) {
    viewMode.value = savedMode;
  }
  
  // 监听视图切换事件
  window.addEventListener('atlas-view-mode-change', handleViewModeChange as EventListener);
});

onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('atlas-view-mode-change', handleViewModeChange as EventListener);
});

// 处理视图切换事件
const handleViewModeChange = (event: CustomEvent) => {
  viewMode.value = event.detail;
};

watch(() => route.query.tags, (newTags) => {
  if (newTags) {
    selectedTags.value = (newTags as string).split(',').map(id => Number(id));
  } else {
    selectedTags.value = [];
  }
}, { immediate: true });

const filteredAtlasData = computed(() => {
  const rawSelectedTags = selectedTags.value.map(id => Number(id));
  if (rawSelectedTags.length === 0) {
    return sortedAtlasData.value;
  }
  const result = sortedAtlasData.value.filter(item => {
    const isMatch = rawSelectedTags.every(tagId =>
      item.tags.some(tag => tag.id !== null && Number(tag.id) === tagId)
    );
    return isMatch;
  });
  return result;
});

const startRead = () => {
  showWelcome.value = false;
};

const handleClick = () => {
  clearTimeout(timerId);
  startRead();
};

const startReadTimeout = () => {
  timerId = setTimeout(() => {
    startRead();
  }, 3000);
};

const atlasShow = async () => {
  try {
    const response = await api.get(ENDPOINTS.SHOW);
    if (response.data.status === 830) {
      atlasData.value = response.data.data.map((item: AtlasItem) => ({
        ...item,
        isLiked: item.isLiked ?? false
      }));
      sortedAtlasData.value = [...atlasData.value].sort((b, a) => a.likes - b.likes);
    }
  } catch (error: any) {
    console.error('获取图集数据失败：', error.message);
  }
};

const getTag = async () => {
  try {
    const response = await api.get(ENDPOINTS.GETTAG);
    if (response.data.status === 830) {
      tagsList.value = response.data.data;
    }
  } catch (error) {
    console.error('获取标签列表失败:', error);
  }
};

const handleLikes = async (item: AtlasItem, event: Event) => {
  event.stopPropagation();
  
  // 检查是否登录
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞');
    // 保存当前路径，登录后返回
    localStorage.setItem('redirectAfterLogin', route.fullPath);
    // 跳转到登录页
    const router = useRouter();
    router.push('/login');
    return;
  }
  
  try {
    const response = await api.post(ENDPOINTS.LIKES, { id: item.id });
    if (response.data.status === 830) {
      const { action, isLiked } = response.data;
      item.isLiked = isLiked;
      // 根据操作类型更新点赞数
      if (action === 'like') {
        item.likes++;
        ElMessage.success('点赞成功');
      } else {
        item.likes--;
        ElMessage.success('已取消点赞');
      }
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录');
      userStore.logout();
      localStorage.setItem('redirectAfterLogin', route.fullPath);
      const router = useRouter();
      router.push('/login');
    } else {
      ElMessage.error(error.response?.data?.message || '操作失败');
      console.error('点赞失败:', error.message);
    }
  }
};

const zoomImage = (item: AtlasItem) => {
  const previewContainer = document.createElement('div');
  previewContainer.style.position = 'fixed';
  previewContainer.style.top = '0';
  previewContainer.style.left = '0';
  previewContainer.style.width = '100%';
  previewContainer.style.height = '100%';
  previewContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  previewContainer.style.display = 'flex';
  previewContainer.style.justifyContent = 'center';
  previewContainer.style.alignItems = 'center';
  previewContainer.style.zIndex = '9999';
  previewContainer.style.cursor = 'zoom-out';

  const previewImage = document.createElement('img');
  previewImage.src = item.path;
  previewImage.style.maxWidth = '90%';
  previewImage.style.maxHeight = '90%';
  previewImage.style.objectFit = 'contain';
  previewImage.style.border = '6px solid #0a0a0a';
  previewImage.style.boxShadow = '12px 12px 0 rgba(0,0,0,0.5)';

  previewContainer.appendChild(previewImage);
  document.body.appendChild(previewContainer);

  previewContainer.addEventListener('click', () => {
    document.body.removeChild(previewContainer);
  });
};

const downloadImage = (item: AtlasItem) => {
  const url = new URL(item.path);
  url.searchParams.append('download', '1');

  const link = document.createElement('a');
  link.target = '_blank';
  link.href = url.toString();
  link.download = `${item.title}_${item.author}.jpg`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 0);
};

// 野兽派便利贴相关方法
const getNoteClass = (index: number) => {
  const classes = ['note-tilt-left', 'note-tilt-right', 'note-tilt-none'];
  return classes[index % 3];
};

const getNoteStyle = (index: number) => {
  const color = noteColors[index % noteColors.length];
  const rotation = (index % 3 - 1) * 2; // -2, 0, 2 degrees
  return {
    backgroundColor: color.bg,
    borderColor: color.border,
    transform: `rotate(${rotation}deg)`,
  };
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'masonry' ? 'brutalist' : 'masonry';
  localStorage.setItem('atlasViewMode', viewMode.value);
};

// 暴露给父组件
defineExpose({
  toggleViewMode,
  viewMode,
});

watchEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 768) {
      welcomeTitle.value = '寒楓の照片墙';
      intro.value = '生活の瞬間を捉え';
    } else {
      welcomeTitle.value = '寒楓のフォトギャラリー';
    }
  };
  handleResize();
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
</script>

<style scoped>
/* ========== 基础样式变量 ========== */
:root {
  --primary-color: #007bff;
  --text-color: #212529;
  --text-secondary: #6c757d;
  --bg-color: #ffffff;
  --bg-secondary: #f8f9fa;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;
}

/* ========== 欢迎页面 ========== */
.welcome-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 1000;
}

.welcome-row {
  background-color: #f8fafc;
  background-image: url('https://hanphone.top/blog/atlas/background.jpeg');
  background-size: cover;
  background-position: center;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome {
  background-color: rgba(0, 0, 0, 0);
  border: none;
  height: 100%;
  position: relative;
}

.border {
  width: 812px;
  height: 112px;
  position: absolute;
  top: -6px;
  left: -6px;
  border: 3px solid white;
  box-sizing: border-box;
  animation: clipMe 5s linear infinite;
}

.tit {
  box-sizing: border-box;
  position: relative;
  width: 800px;
  height: 100px;
  line-height: 100px;
  box-shadow: inset 0 0 0 1px white;
  margin: 40px auto;
  margin-top: 80px;
  color: rgb(77, 77, 77,1);
  text-align: center;
  font-size: 50px;
  font-weight: normal;
  letter-spacing: 10px;
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
}

.intro {
  letter-spacing: 5px;
  line-height: 50px;
  width: 80%;
  margin: 0 auto;
  text-align: center;
  font-weight: normal;
  color: rgba(77,77,77,1);
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
}

.down {
  animation: bounce 2s infinite;
  animation-duration: 3s;
  font-size: 25px;
  position: absolute;
  bottom: 8vmin;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.down:hover {
  animation: none;
  cursor: pointer;
  box-shadow: 0 0 20px 0 white;
  transition: all .2s;
}

/* ========== 瀑布流布局 ========== */
.atlas-container {
  padding: 0;
  width: 100vw;
  margin: 0 auto;
  position: relative;
  background: linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 25%, #f0f0f0 50%, #dcdcdc 75%, #e8e8e8 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  min-height: 100vh;
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 噪点纹理叠加 - 瀑布流 */
.atlas-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

/* 网格背景 - 瀑布流 */
.atlas-container::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(rgba(0,0,0,0.02) 2px, transparent 2px),
    linear-gradient(90deg, rgba(0,0,0,0.02) 2px, transparent 2px);
  background-size: 25px 25px, 25px 25px, 100px 100px, 100px 100px;
  pointer-events: none;
  z-index: 0;
}

.atlas-container::-webkit-scrollbar {
  display: none;
}

.masonry-columns {
  column-count: 4;
  column-gap: 0;
  position: relative;
  z-index: 1;
}

@media (max-width: 1200px) { .masonry-columns { column-count: 3; } }
@media (max-width: 992px) { .masonry-columns { column-count: 2; } }
@media (max-width: 768px) { .masonry-columns { column-count: 2; } }
@media (max-width: 480px) { 
  .masonry-columns { column-count: 2; }
  .atlas-container { padding: 0; }
}

.grid-item {
  break-inside: avoid;
  margin-bottom: 0;
  padding: 0;
  line-height: 0;
  font-size: 0;
}

.photo-card {
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  transition: var(--transition);
  margin-left: -1px;
  margin-top: -1px;
  background-color: var(--bg-color);
  border: none;
  border-bottom: 1px solid transparent;
  border-left: 1px solid transparent;
}

.photo-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.photo-wrapper {
  position: relative;
  overflow: hidden;
}

.image {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s;
}

.photo-card:hover .image {
  transform: scale(1.03);
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 50%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 8px;
  color: white;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-info-overlay {
  width: 100%;
  gap: 6px;
  display: flex;
  flex-direction: column;
}

.title-author-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 4px;
}

.tags-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 4px;
}

.photo-title {
  font-weight: 500;
  font-size: 14px;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  flex: 1;
  margin-right: 8px;
}

.photo-author {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.photo-description {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  text-align: right;
}

.photo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  flex: 1;
  overflow: hidden;
}

.photo-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
}

.photo-actions {
  display: flex;
  align-items: center;
  margin-left: 6px;
  white-space: nowrap;
  gap: 4px;
}

.action-icon {
  cursor: pointer;
  color: white;
  margin-left: 4px;
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

.likes-count {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

/* ========== 野兽派便利贴布局 ========== */
.brutalist-container {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 25%, #f0f0f0 50%, #dcdcdc 75%, #e8e8e8 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  position: relative;
  overflow-x: hidden;
  padding: 40px 20px;
  box-sizing: border-box;
  font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 噪点纹理叠加 */
.brutalist-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

/* 网格背景 */
.grid-background {
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(rgba(0,0,0,0.02) 2px, transparent 2px),
    linear-gradient(90deg, rgba(0,0,0,0.02) 2px, transparent 2px);
  background-size: 25px 25px, 25px 25px, 100px 100px, 100px 100px;
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
  width: 200px;
  height: 200px;
  border: 6px solid #0a0a0a;
  top: 5%;
  left: 3%;
  transform: rotate(25deg);
  opacity: 0.08;
  box-shadow: 8px 8px 0 rgba(0,0,0,0.1);
}

.geo-2 {
  width: 0;
  height: 0;
  border-left: 100px solid transparent;
  border-right: 100px solid transparent;
  border-bottom: 170px solid #ff6b6b;
  bottom: 10%;
  right: 5%;
  opacity: 0.15;
  transform: rotate(-10deg);
}

.geo-3 {
  width: 80px;
  height: 80px;
  background: #00b4d8;
  top: 15%;
  right: 8%;
  opacity: 0.4;
  transform: rotate(45deg);
  box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
}

.geo-4 {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 5px dashed #ffd93d;
  bottom: 25%;
  left: 5%;
  opacity: 0.2;
  animation: rotateSlow 20s linear infinite;
}

.geo-5 {
  width: 0;
  height: 0;
  border-top: 60px solid transparent;
  border-bottom: 60px solid transparent;
  border-left: 100px solid #6bcf7f;
  top: 50%;
  left: 2%;
  opacity: 0.12;
  transform: rotate(15deg);
}

.geo-6 {
  width: 60px;
  height: 200px;
  background: repeating-linear-gradient(
    45deg,
    #ff6b6b,
    #ff6b6b 10px,
    transparent 10px,
    transparent 20px
  );
  top: 30%;
  right: 3%;
  opacity: 0.15;
  transform: rotate(-5deg);
}

@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 便利贴区域 */
.sticky-notes-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  padding: 20px;
}

@media (max-width: 768px) {
  .sticky-notes-area {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    padding: 10px;
  }
}

/* 便利贴 */
.sticky-note {
  position: relative;
  padding: 20px;
  border: 4px solid;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.sticky-note:hover {
  transform: translate(-4px, -4px) rotate(0deg) !important;
  box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.3);
}

.note-tilt-left { transform: rotate(-2deg); }
.note-tilt-right { transform: rotate(2deg); }
.note-tilt-none { transform: rotate(0deg); }

/* 胶带效果 */
.tape {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 30px;
  background: rgba(255, 255, 255, 0.4);
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tape::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 10px,
    rgba(0, 0, 0, 0.03) 10px,
    rgba(0, 0, 0, 0.03) 20px
  );
}

/* 便利贴图片 */
.note-image-wrapper {
  margin: -20px -20px 15px -20px;
  overflow: hidden;
  border-bottom: 4px solid;
  cursor: pointer;
}

.note-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.note-image:hover {
  transform: scale(1.05);
}

/* 便利贴内容 */
.note-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
}

.note-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  letter-spacing: 0.1em;
}

.note-date {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
}

.note-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0a0a0a;
  margin: 0 0 8px 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.note-author {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.note-description {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1.5;
  margin: 0 0 15px 0;
  flex: 1;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}

.note-tag {
  font-size: 0.7rem;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(0, 0, 0, 0.2);
  font-weight: 600;
  color: #0a0a0a;
}

/* 便利贴操作按钮 - 创意野兽派风格 */
.note-actions {
  display: flex;
  gap: 12px;
  padding-top: 15px;
  border-top: 2px dashed rgba(0, 0, 0, 0.3);
  position: relative;
}

/* 按钮基础样式 - 胶带效果 */
.brutalist-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.8) 100%);
  color: #0a0a0a;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 
    3px 3px 0 #0a0a0a,
    3px 3px 0 1px rgba(0,0,0,0.1);
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  overflow: hidden;
}

/* 按钮上的胶带效果 */
.brutalist-btn::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 16px;
  background: rgba(255, 255, 255, 0.4);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%);
}

/* 按钮内部斜纹 */
.brutalist-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    rgba(0,0,0,0.03) 3px,
    rgba(0,0,0,0.03) 6px
  );
  pointer-events: none;
}

/* 悬停效果 - 按下动画 */
.brutalist-btn:hover {
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  transform: translate(1px, 1px);
  box-shadow: 
    2px 2px 0 #0a0a0a,
    2px 2px 0 1px rgba(0,0,0,0.1);
}

/* 点击效果 */
.brutalist-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 
    0 0 0 #0a0a0a,
    inset 2px 2px 4px rgba(0,0,0,0.1);
}

/* 小按钮 */
.brutalist-btn.small {
  padding: 8px 10px;
  font-size: 0.7rem;
}

/* 点赞按钮 - 特殊样式 */
.like-btn {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);
}

.like-btn:hover {
  background: linear-gradient(135deg, #ffe8e8 0%, #ffd0d0 100%);
}

.like-btn.is-liked {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #0a0a0a;
  box-shadow: 
    3px 3px 0 #b8860b,
    3px 3px 0 1px rgba(184, 134, 11, 0.3);
  animation: pulseLike 0.3s ease;
}

.like-btn.is-liked:hover {
  box-shadow: 
    2px 2px 0 #b8860b,
    2px 2px 0 1px rgba(184, 134, 11, 0.3);
}

@keyframes pulseLike {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 下载按钮 - 蓝色调 */
.brutalist-btn:nth-child(2) {
  background: linear-gradient(135deg, #f0f8ff 0%, #e0f0ff 100%);
}

.brutalist-btn:nth-child(2):hover {
  background: linear-gradient(135deg, #e8f4ff 0%, #d0e8ff 100%);
}

/* 放大按钮 - 绿色调 */
.brutalist-btn:nth-child(1) {
  background: linear-gradient(135deg, #f5fff5 0%, #e0f5e0 100%);
}

.brutalist-btn:nth-child(1):hover {
  background: linear-gradient(135deg, #e8ffe8 0%, #d0f0d0 100%);
}

.like-count {
  margin-left: 4px;
}

/* 角落标记 */
.corner-mark {
  position: fixed;
  font-size: 2rem;
  font-weight: 100;
  color: #0a0a0a;
  z-index: 2;
  opacity: 0.3;
}

.corner-mark.tl { top: 20px; left: 20px; }
.corner-mark.tr { top: 20px; right: 20px; }
.corner-mark.bl { bottom: 20px; left: 20px; }
.corner-mark.br { bottom: 20px; right: 20px; }

/* ========== 动画效果 ========== */
.fade-enter, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 1s; }

.slide-left-enter-active { transition: all 0.5s ease-out; }
.slide-left-leave-active { transition: all 0.5s ease-in; }
.slide-left-enter-from { transform: translateX(-100%); }
.slide-left-leave-to { transform: translateX(-100%); }

@keyframes clipMe {
  0%, 100% { clip: rect(0px, 806px, 6px, 0px); }
  25% { clip: rect(0px, 6px, 112px, 0px); }
  50% { clip: rect(112px, 812px, 112px, 0px); }
  75% { clip: rect(0px, 812px, 112px, 806px); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translate(-50%, 0); }
  40% { transform: translate(-50%, -5px); }
  60% { transform: translate(-50%, -3px); }
}

/* ========== 响应式设计 ========== */
@media screen and (max-width: 768px) {
  .welcome-row { background-image: url('https://hanphone.top/blog/atlas/background.jpeg'); }
  .welcome { width: 100%; }
  .border { display: none; }
  .tit { font-size: 2rem; width: 100%; line-height: 50px; letter-spacing: 2px; height: auto; }
  .intro { font-size: 1rem; line-height: 30px; }
  
  .photo-overlay { padding: 8px; }
  .photo-title { font-size: 12px; }
  .photo-description { font-size: 10px; }
  .photo-actions { gap: 2px; }
  
  .brutalist-container { padding: 20px 10px; }
  .sticky-note { min-height: 350px; }
  .note-image { height: 150px; }
}

/* ========== 暗黑模式 ========== */
.dark {
  --primary-color: #4dabf7;
  --text-color: #f8f9fa;
  --text-secondary: #adb5bd;
  --bg-color: #111827;
  --bg-secondary: #343a40;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.dark .welcome-row { background-color: #111827; }
.dark .welcome { background-color: rgba(0, 0, 0, 0.1); }
.dark .tit, .dark .intro { color: white; }

.dark .atlas-container {
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0f0f0f 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

.dark .atlas-container::before {
  opacity: 0.05;
}

.dark .atlas-container::after {
  background-image: 
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.02) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 2px, transparent 2px);
}

.dark .brutalist-container {
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0f0f0f 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

.dark .brutalist-container::before {
  opacity: 0.05;
}

.dark .grid-background {
  background-image: 
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.02) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 2px, transparent 2px);
}

.dark .geo-1 { border-color: #f5f5f5; opacity: 0.1; }
.dark .geo-2 { border-bottom-color: #f5f5f5; }
.dark .geo-3 { opacity: 0.2; }

.dark .sticky-note {
  box-shadow: 8px 8px 0 rgba(255, 255, 255, 0.1);
}

.dark .sticky-note:hover {
  box-shadow: 12px 12px 0 rgba(255, 255, 255, 0.15);
}

.dark .note-title,
.dark .note-author,
.dark .note-description { color: #0a0a0a; }

.dark .corner-mark { color: #f5f5f5; }

.dark .brutalist-btn {
  background: linear-gradient(135deg, rgba(60,60,60,0.9) 0%, rgba(40,40,40,0.8) 100%);
  color: #f5f5f5;
  box-shadow: 
    3px 3px 0 #000,
    3px 3px 0 1px rgba(0,0,0,0.3);
}

.dark .brutalist-btn:hover {
  background: linear-gradient(135deg, rgba(70,70,70,0.9) 0%, rgba(50,50,50,0.8) 100%);
}

.dark .brutalist-btn::before {
  background: rgba(255, 255, 255, 0.15);
}

.dark .like-btn {
  background: linear-gradient(135deg, rgba(80,60,60,0.9) 0%, rgba(60,40,40,0.8) 100%);
}

.dark .like-btn.is-liked {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #0a0a0a;
  box-shadow: 
    3px 3px 0 #b8860b,
    3px 3px 0 1px rgba(184, 134, 11, 0.3);
}

.dark .brutalist-btn:nth-child(2) {
  background: linear-gradient(135deg, rgba(50,60,80,0.9) 0%, rgba(35,45,65,0.8) 100%);
}

.dark .brutalist-btn:nth-child(1) {
  background: linear-gradient(135deg, rgba(50,70,50,0.9) 0%, rgba(35,55,35,0.8) 100%);
}
</style>
