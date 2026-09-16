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
    <div v-if="filteredAtlasData.length === 0" class="atlas-empty">没有符合筛选条件的照片，换个标签试试吧</div>
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
              :preview-src-list="previewList"
              :initial-index="itemIndex(item)"
              :preview-teleported="true"
              hide-on-click-modal
              :ref="(el: any) => setImageRef(item.id, el)"
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <el-icon class="is-loading"><Loading /></el-icon>
                </div>
              </template>
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
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
                    <el-icon class="action-icon" @click="openPreview(item)">
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
  <div v-else-if="viewMode === 'brutalist'" class="brutalist-container">
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
    <div v-if="filteredAtlasData.length === 0" class="atlas-empty">没有符合筛选条件的照片，换个标签试试吧</div>
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
            :preview-src-list="previewList"
            :initial-index="itemIndex(item)"
            :preview-teleported="true"
            hide-on-click-modal
            :ref="(el: any) => setImageRef(item.id, el)"
          >
            <template #placeholder>
              <div class="image-placeholder">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </template>
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
                <span>加载失败</span>
              </div>
            </template>
          </el-image>
        </div>
        
        <!-- 内容区 -->
        <div class="note-content">
          <div class="note-header">
            <span class="note-number">{{ String(index + 1).padStart(3, '0') }}</span>
            <span class="note-date">{{ formatTakenDate(item) }}</span>
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
          <button class="brutalist-btn small" @click="openPreview(item)">
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

  <!-- 时间线布局 -->
  <div v-else class="timeline-container">
    <div v-if="filteredAtlasData.length === 0" class="atlas-empty">没有符合筛选条件的照片，换个标签试试吧</div>
    <div class="timeline">
      <template v-for="group in timelineGroups" :key="group.year">
        <div class="timeline-year">
          <span class="timeline-year-label">{{ group.year === '0' ? '未知年份' : group.year }}</span>
        </div>
        <div v-for="item in group.items" :key="item.id" class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-card">
            <div class="timeline-photo">
              <el-image
                :src="item.path"
                class="timeline-image"
                lazy
                :preview-src-list="previewList"
                :initial-index="itemIndex(item)"
                :preview-teleported="true"
                hide-on-click-modal
                :ref="(el: any) => setImageRef(item.id, el)"
              >
                <template #placeholder>
                  <div class="image-placeholder"><el-icon class="is-loading"><Loading /></el-icon></div>
                </template>
                <template #error>
                  <div class="image-error"><el-icon><Picture /></el-icon><span>加载失败</span></div>
                </template>
              </el-image>
            </div>
            <div class="timeline-info">
              <div class="timeline-title">{{ item.title }}</div>
              <div class="timeline-meta">@{{ item.author }} · {{ formatTakenDate(item) }}</div>
              <div class="timeline-tags" v-if="item.tags && item.tags.length">
                <span v-for="tag in item.tags.slice(0, 3)" :key="tag.id" class="note-tag">{{ tag.name }}</span>
              </div>
              <div class="timeline-actions">
                <button class="brutalist-btn small" @click="openPreview(item)">
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
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watchEffect, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '@/api/interceptor';
import { ENDPOINTS } from '@/api/api';
import { useUserStore } from '@/store/store';
import { ArrowRightBold, Star, StarFilled, ZoomIn, Download, Loading, Picture } from '@element-plus/icons-vue';

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
  taken_time?: string;
  isLiked: boolean;
  tags: Tag[];
  username: string;
}

type SortMode = 'hot' | 'likes' | 'upload_desc' | 'upload_asc' | 'taken_desc';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const tagsList = ref<Tag[]>([]);
const atlasData = ref<AtlasItem[]>([]);
const selectedTags = ref<number[]>([]);
const showWelcome = ref(true);
const imageRefMap = new Map<number, any>();
let timerId: ReturnType<typeof setTimeout> | undefined = undefined;
const intro = ref('生活の瞬間を捉え、感動を記録する');
const welcomeTitle = ref('寒楓のフォトギャラリー');

// 视图模式：masonry(瀑布流) | brutalist(野兽派便利贴) | timeline(时间线)
const viewMode = ref<'masonry' | 'brutalist' | 'timeline'>('brutalist');

// 排序模式：hot(综合热度) | likes | upload_desc | upload_asc | taken_desc
const sortMode = ref<SortMode>('hot');

// 综合热度算法常量（调参只改这里）
const HOT_POW = 1.5;      // 时间衰减指数，越大旧照片掉得越快
const HOT_SMOOTH = 2;     // 小时平滑项，避免除零

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
  
  // 本次会话已看过欢迎页则直接跳过
  const hasSeenWelcome = sessionStorage.getItem('atlasWelcomeShown') === '1';
  if (hasSeenWelcome) {
    showWelcome.value = false;
  } else {
    startReadTimeout();
  }
  
  // 从 localStorage 读取视图模式
  const savedMode = localStorage.getItem('atlasViewMode') as 'masonry' | 'brutalist' | 'timeline';
  if (savedMode) {
    viewMode.value = savedMode;
  }

  // 从 localStorage 读取排序模式
  const savedSort = localStorage.getItem('atlasSortMode') as SortMode | null;
  if (savedSort) {
    sortMode.value = savedSort;
  }

  // 监听视图/排序切换事件
  window.addEventListener('atlas-view-mode-change', handleViewModeChange as EventListener);
  window.addEventListener('atlas-sort-change', handleSortChange as EventListener);
});

onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('atlas-view-mode-change', handleViewModeChange as EventListener);
  window.removeEventListener('atlas-sort-change', handleSortChange as EventListener);
});

// 处理视图切换事件
const handleViewModeChange = (event: CustomEvent) => {
  viewMode.value = event.detail;
};

// 处理排序切换事件
const handleSortChange = (event: CustomEvent) => {
  sortMode.value = event.detail as SortMode;
};

watch(() => route.query.tags, (newTags) => {
  if (newTags) {
    selectedTags.value = (newTags as string).split(',').map(id => Number(id));
  } else {
    selectedTags.value = [];
  }
}, { immediate: true });

// 生效时间：优先拍摄时间，否则上传时间
const effectiveTime = (item: AtlasItem) => {
  const d = new Date(item.taken_time || item.upload_time).getTime();
  return isNaN(d) ? 0 : d;
};

// Hacker News 风格综合热度
const hotScore = (item: AtlasItem) => {
  const t = effectiveTime(item);
  if (!t) return 0;
  const hours = Math.max(0, (Date.now() - t) / 3600000);
  return Math.log(item.likes + 2) / Math.pow(hours + HOT_SMOOTH, HOT_POW);
};

// 按当前排序模式排序
const sortedAtlasData = computed(() => {
  const arr = [...atlasData.value];
  switch (sortMode.value) {
    case 'likes':
      arr.sort((a, b) => b.likes - a.likes);
      break;
    case 'upload_desc':
      arr.sort((a, b) => new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime());
      break;
    case 'upload_asc':
      arr.sort((a, b) => new Date(a.upload_time).getTime() - new Date(b.upload_time).getTime());
      break;
    case 'taken_desc':
      arr.sort((a, b) => effectiveTime(b) - effectiveTime(a));
      break;
    case 'hot':
    default:
      arr.sort((a, b) => hotScore(b) - hotScore(a));
      break;
  }
  return arr;
});

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

// 时间线分组：按年份聚合，年份降序（无效日期归入"未知年份"并排最后），组内保持当前排序
const timelineGroups = computed(() => {
  const groups: { year: string; items: AtlasItem[] }[] = [];
  for (const item of filteredAtlasData.value) {
    const d = new Date(item.taken_time || item.upload_time);
    const year = isNaN(d.getTime()) ? '0' : String(d.getFullYear());
    let g = groups.find((x) => x.year === year);
    if (!g) {
      g = { year, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups.sort((a, b) => {
    const na = a.year === '0' ? -1 : Number(a.year);
    const nb = b.year === '0' ? -1 : Number(b.year);
    return nb - na;
  });
});

const startRead = () => {
  sessionStorage.setItem('atlasWelcomeShown', '1');
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

// 点赞请求中的照片id，防止连点竞态
const likingIds = new Set<number>();

const handleLikes = async (item: AtlasItem, event: Event) => {
  event.stopPropagation();
  
  // 该照片请求进行中时忽略重复点击
  if (likingIds.has(item.id)) return;
  
  // 检查是否登录
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞');
    // 保存当前路径，登录后返回
    localStorage.setItem('redirectAfterLogin', route.fullPath);
    // 跳转到登录页
    router.push('/login');
    return;
  }
  
  likingIds.add(item.id);
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
      router.push('/login');
    } else {
      ElMessage.error(error.response?.data?.message || '操作失败');
      console.error('点赞失败:', error.message);
    }
  } finally {
    likingIds.delete(item.id);
  }
};

// 图片预览：全部图片路径（供 el-image 内置 viewer 使用）
const previewList = computed(() => filteredAtlasData.value.map(item => item.path));

// 当前图片在预览列表中的下标
const itemIndex = (item: AtlasItem) => filteredAtlasData.value.indexOf(item);

// 收集每个 el-image 组件实例，用于程序化打开预览
const setImageRef = (id: number, el: any) => {
  if (el) {
    imageRefMap.set(id, el);
  } else {
    imageRefMap.delete(id);
  }
};

const openPreview = (item: AtlasItem) => {
  const el = imageRefMap.get(item.id);
  if (el && typeof el.showPreview === 'function') {
    el.showPreview();
  }
};

const downloadImage = (item: AtlasItem) => {
  const url = new URL(item.path);
  url.searchParams.append('download', '1');

  const match = url.pathname.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? match[1] : 'jpg';

  const link = document.createElement('a');
  link.target = '_blank';
  link.href = url.toString();
  link.download = `${item.title}_${item.author}.${ext}`;
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

// 优先显示拍摄时间，无则回退上传时间
const formatTakenDate = (item: AtlasItem) => {
  const s = item.taken_time || item.upload_time;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

.atlas-empty {
  position: relative;
  z-index: 1;
  padding: 80px 20px;
  text-align: center;
  font-size: 18px;
  letter-spacing: 2px;
  color: #6c757d;
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
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
  cursor: zoom-in;
}

.image-placeholder,
.image-error {
  width: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a8a8a;
  background-color: #e9e9e9;
  font-size: 13px;
}

.note-image-wrapper .image-placeholder,
.note-image-wrapper .image-error {
  min-height: 200px;
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

/* ========== 时间线布局 ========== */
.timeline-container {
  min-height: 100vh;
  width: 100vw;
  padding: 60px 20px 80px;
  box-sizing: border-box;
  position: relative;
  background: linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 25%, #f0f0f0 50%, #dcdcdc 75%, #e8e8e8 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

.timeline {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding-left: 40px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #0a0a0a, rgba(10,10,10,0.15));
}

.timeline-year {
  position: relative;
  margin: 32px 0 20px;
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
}

.timeline-year-label {
  display: inline-block;
  padding: 6px 18px;
  background: #0a0a0a;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.25);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
}

.timeline-marker {
  position: absolute;
  left: -40px;
  top: 24px;
  width: 16px;
  height: 16px;
  background: #ffd93d;
  border: 3px solid #0a0a0a;
  transform: rotate(45deg);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.timeline-card {
  display: flex;
  gap: 16px;
  background: #fff;
  border: 3px solid #0a0a0a;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.15);
  padding: 14px;
  transition: all 0.3s ease;
}

.timeline-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.2);
}

.timeline-photo {
  flex-shrink: 0;
  width: 220px;
}

.timeline-image {
  width: 100%;
  height: 170px;
  object-fit: cover;
  display: block;
  cursor: zoom-in;
  border: 2px solid #0a0a0a;
}

.timeline-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timeline-title {
  font-size: 18px;
  font-weight: 700;
  color: #0a0a0a;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.timeline-meta {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  margin-bottom: 10px;
}

.timeline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.timeline-actions {
  margin-top: auto;
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .timeline-container { padding: 40px 10px 60px; }
  .timeline { padding-left: 30px; }
  .timeline::before { left: 6px; }
  .timeline-marker { left: -30px; top: 20px; }
  .timeline-card { flex-direction: column; }
  .timeline-photo { width: 100%; }
  .timeline-image { height: auto; max-height: 260px; }
}

/* 暗色适配 */
.dark .timeline-container {
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0f0f0f 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}
.dark .timeline::before { background: linear-gradient(to bottom, #f5f5f5, rgba(245,245,245,0.15)); }
.dark .timeline-year-label { background: #f5f5f5; color: #0a0a0a; }
.dark .timeline-card { background: #1a1a2e; border-color: #f5f5f5; box-shadow: 8px 8px 0 rgba(255,255,255,0.1); }
.dark .timeline-card:hover { box-shadow: 12px 12px 0 rgba(255,255,255,0.15); }
.dark .timeline-title { color: #f5f5f5; }
.dark .timeline-meta { color: rgba(255,255,255,0.65); }
.dark .timeline-image { border-color: #f5f5f5; }

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
