<template>
  <div class="photo-manager" :class="{ 'batch-mode': isBatchMode }">
    <!-- 野兽派背景 -->
    <div class="grid-background"></div>
    <div class="geo-element geo-1"></div>
    <div class="geo-element geo-2"></div>
    <div class="geo-element geo-3"></div>
    <!-- 顶部工具栏 -->
    <header class="toolbar" :class="{ 'batch-active': isBatchMode }">
      <!-- 普通模式工具栏 -->
      <template v-if="!isBatchMode">
        <div class="toolbar-left">
          <h1 class="page-title">
            {{ userStore.isAdmin ? '照片管理' : '我的照片' }}
            <span class="photo-count">{{ filteredPhotos.length }}</span>
          </h1>
        </div>
        
        <div class="toolbar-center">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="搜索照片..."
              class="search-input"
            />
            <el-icon v-if="searchQuery" class="clear-icon" @click="searchQuery = ''"><Close /></el-icon>
          </div>
        </div>
        
        <div class="toolbar-right">
          <el-button-group class="view-toggle">
            <el-button 
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              @click="viewMode = 'grid'"
              text
            >
              <el-icon><Grid /></el-icon>
            </el-button>
            <el-button 
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="viewMode = 'list'"
              text
            >
              <el-icon><List /></el-icon>
            </el-button>
          </el-button-group>
          
          <el-dropdown trigger="click" @command="handleSort">
            <el-button text>
              <el-icon><Sort /></el-icon>
              {{ sortLabel }}
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="newest">最新上传</el-dropdown-item>
                <el-dropdown-item command="oldest">最早上传</el-dropdown-item>
                <el-dropdown-item command="likes">最多点赞</el-dropdown-item>
                <el-dropdown-item command="title">名称排序</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
          <el-button type="primary" class="upload-btn" @click="openUploadWizard">
            <el-icon><Plus /></el-icon>
            <span>上传</span>
          </el-button>
        </div>
      </template>
      
      <!-- 批量模式工具栏 -->
      <template v-else>
        <div class="batch-bar">
          <div class="batch-left">
            <el-button text @click="exitBatchMode">
              <el-icon><Close /></el-icon>
            </el-button>
            <span class="batch-count">已选择 {{ selectedPhotos.size }} 项</span>
          </div>
          
          <div class="batch-actions">
            <el-button v-if="userStore.isAdmin" text @click="batchApprove">
              <el-icon><Check /></el-icon>
              通过审核
            </el-button>
            <el-button text @click="batchEdit">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button text @click="batchDelete" type="danger">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </template>
    </header>

    <!-- 筛选栏 -->
    <div class="filter-bar" v-if="!isBatchMode && userStore.isAdmin">
      <div class="filter-chips">
        <button 
          class="filter-chip" 
          :class="{ active: filterStatus === null }"
          @click="filterStatus = null"
        >
          全部
        </button>
        <button 
          class="filter-chip" 
          :class="{ active: filterStatus === 1 }"
          @click="filterStatus = 1"
        >
          <span class="status-dot approved"></span>
          已通过
        </button>
        <button 
          class="filter-chip" 
          :class="{ active: filterStatus === 0 }"
          @click="filterStatus = 0"
        >
          <span class="status-dot pending"></span>
          待审核
        </button>
      </div>
      
      <div class="filter-tags" v-if="availableTags.length > 0">
        <span class="filter-label">标签:</span>
        <el-tag
          v-for="tag in selectedTags"
          :key="tag"
          closable
          @close="removeTagFilter(tag)"
          class="selected-tag"
        >
          {{ tag }}
        </el-tag>
        <el-dropdown trigger="click" @command="addTagFilter">
          <el-button size="small" text>
            <el-icon><Plus /></el-icon>
            添加标签
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-for="tag in unselectedTags" 
                :key="tag.id" 
                :command="tag.name"
              >
                {{ tag.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="content-area" :class="viewMode">
      <!-- 空状态 -->
      <div v-if="filteredPhotos.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无照片">
          <template #image>
            <div class="empty-illustration">
              <el-icon :size="80"><Picture /></el-icon>
            </div>
          </template>
          <el-button type="primary" size="large" @click="openUploadWizard">
            <el-icon><Plus /></el-icon>
            上传第一张照片
          </el-button>
        </el-empty>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 网格视图 -->
      <div v-if="viewMode === 'grid' && filteredPhotos.length > 0" class="grid-view">
        <div 
          v-for="group in groupedPhotos" 
          :key="group.date" 
          class="photo-group"
        >
          <div class="group-header">
            <h3 class="group-title">{{ group.date }}</h3>
            <span class="group-count">{{ group.photos.length }} 张</span>
          </div>
          
          <div class="photo-grid">
            <div 
              v-for="photo in group.photos" 
              :key="photo.id"
              class="photo-item"
              :class="{ 
                'is-selected': selectedPhotos.has(photo.id),
                'is-hovering': hoveredPhoto === photo.id 
              }"
              @mouseenter="hoveredPhoto = photo.id"
              @mouseleave="hoveredPhoto = null"
              @click="handlePhotoClick(photo, $event)"
            >
              <!-- 选择框 -->
              <div 
                class="selection-indicator"
                :class="{ 'is-visible': isBatchMode || hoveredPhoto === photo.id }"
                @click.stop="toggleSelection(photo.id)"
              >
                <div class="checkbox" :class="{ 'is-checked': selectedPhotos.has(photo.id) }">
                  <el-icon v-if="selectedPhotos.has(photo.id)"><Check /></el-icon>
                </div>
              </div>
              
              <!-- 图片 -->
              <div class="photo-thumb">
                <img :src="photo.path" :alt="photo.title" loading="lazy" />
                
                <!-- 悬停遮罩 -->
                <div class="photo-overlay" v-if="!isBatchMode">
                  <div class="overlay-actions">
                    <el-button circle size="small" @click.stop="openDetailPanel(photo)">
                      <el-icon><InfoFilled /></el-icon>
                    </el-button>
                    <el-button circle size="small" @click.stop="quickEdit(photo)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </div>
                </div>
                
                <!-- 状态标记 -->
                <div class="photo-badges">
                  <span v-if="photo.type === 0" class="badge pending">审核中</span>
                  <span v-if="photo.likes > 0" class="badge likes">
                    <el-icon><Star /></el-icon>
                    {{ photo.likes }}
                  </span>
                </div>
              </div>
              
              <!-- 信息 -->
              <div class="photo-info">
                <p class="photo-title" :title="photo.title">{{ photo.title }}</p>
                <p class="photo-meta">{{ photo.author }} · {{ formatDate(photo.upload_time) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list' && filteredPhotos.length > 0" class="list-view">
        <div class="list-header">
          <div class="list-cell checkbox-cell">
            <div class="checkbox" :class="{ 'is-checked': isAllSelected }" @click="toggleSelectAll">
              <el-icon v-if="isAllSelected"><Check /></el-icon>
            </div>
          </div>
          <div class="list-cell thumb-cell">照片</div>
          <div class="list-cell info-cell">信息</div>
          <div class="list-cell meta-cell">上传时间</div>
          <div class="list-cell status-cell">状态</div>
          <div class="list-cell actions-cell">操作</div>
        </div>
        
        <div 
          v-for="photo in filteredPhotos" 
          :key="photo.id"
          class="list-item"
          :class="{ 'is-selected': selectedPhotos.has(photo.id) }"
          @click="handlePhotoClick(photo, $event)"
        >
          <div class="list-cell checkbox-cell" @click.stop="toggleSelection(photo.id)">
            <div class="checkbox" :class="{ 'is-checked': selectedPhotos.has(photo.id) }">
              <el-icon v-if="selectedPhotos.has(photo.id)"><Check /></el-icon>
            </div>
          </div>
          
          <div class="list-cell thumb-cell">
            <img :src="photo.path" :alt="photo.title" />
          </div>
          
          <div class="list-cell info-cell">
            <p class="item-title">{{ photo.title }}</p>
            <p class="item-author">{{ photo.author }}</p>
            <div class="item-tags">
              <el-tag v-for="tag in photo.tags.slice(0, 2)" :key="tag.id" size="small">
                {{ tag.name }}
              </el-tag>
              <span v-if="photo.tags.length > 2" class="more-tags">+{{ photo.tags.length - 2 }}</span>
            </div>
          </div>
          
          <div class="list-cell meta-cell">
            {{ formatDateTime(photo.upload_time) }}
          </div>
          
          <div class="list-cell status-cell">
            <el-tag :type="photo.type === 1 ? 'success' : 'warning'" size="small" effect="light">
              {{ photo.type === 1 ? '已通过' : '审核中' }}
            </el-tag>
          </div>
          
          <div class="list-cell actions-cell">
            <el-button text size="small" @click.stop="openDetailPanel(photo)">
              <el-icon><InfoFilled /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="quickEdit(photo)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" @click.stop="confirmDelete(photo)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧详情面板 -->
    <transition name="slide-panel">
      <aside v-if="detailPanelOpen && selectedPhoto" class="detail-panel">
        <div class="panel-header">
          <h3>照片详情</h3>
          <el-button text circle @click="detailPanelOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="panel-content">
          <!-- 预览图 -->
          <div class="panel-preview">
            <img :src="selectedPhoto.path" :alt="selectedPhoto.title" />
          </div>
          
          <!-- 可编辑表单 -->
          <div class="panel-form">
            <div class="form-group">
              <label>标题</label>
              <el-input 
                v-model="editForm.title" 
                @blur="saveField('title')"
                placeholder="照片标题"
              />
            </div>
            
            <div class="form-group">
              <label>作者</label>
              <el-input 
                v-model="editForm.author" 
                @blur="saveField('author')"
                placeholder="拍摄者"
              />
            </div>
            
            <div class="form-group">
              <label>描述</label>
              <el-input 
                v-model="editForm.description" 
                type="textarea" 
                :rows="3"
                @blur="saveField('description')"
                placeholder="照片描述..."
              />
            </div>
            
            <div class="form-group">
              <label>标签</label>
              <div class="tag-editor">
                <el-tag
                  v-for="(tag, index) in editForm.tags"
                  :key="tag.id"
                  closable
                  @close="removeTag(index)"
                  class="edit-tag"
                >
                  {{ tag.name }}
                </el-tag>
                <el-input
                  v-if="tagInputVisible"
                  ref="tagInputRef"
                  v-model="newTagName"
                  size="small"
                  style="width: 100px"
                  @keyup.enter="addTag"
                  @blur="addTag"
                />
                <el-button v-else size="small" text @click="showTagInput">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </div>
            
            <!-- 管理员专用 -->
            <div v-if="userStore.isAdmin" class="form-group admin-only">
              <label>审核状态</label>
              <el-switch
                v-model="editForm.type"
                :active-value="1"
                :inactive-value="0"
                @change="saveField('type')"
                active-text="已通过"
                inactive-text="待审核"
              />
            </div>
          </div>
          
          <!-- 元数据 -->
          <div class="panel-meta">
            <div class="meta-item">
              <span class="meta-label">上传时间</span>
              <span class="meta-value">{{ formatDateTime(selectedPhoto.upload_time) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">点赞数</span>
              <span class="meta-value">{{ selectedPhoto.likes }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">照片ID</span>
              <span class="meta-value">#{{ selectedPhoto.id }}</span>
            </div>
          </div>
        </div>
        
        <div class="panel-footer">
          <el-button type="danger" text @click="confirmDelete(selectedPhoto)">
            <el-icon><Delete /></el-icon>
            删除照片
          </el-button>
        </div>
      </aside>
    </transition>

    <!-- 上传向导 - 全新设计 -->
    <el-dialog
      v-model="uploadWizardOpen"
      :title="uploadStep === 0 ? '选择照片' : uploadStep === 1 ? '编辑信息' : '上传进度'"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close
      class="upload-wizard"
      :class="{ 'upload-step-0': uploadStep === 0, 'upload-step-1': uploadStep === 1 }"
    >
      <!-- 步骤指示器 -->
      <div class="step-indicator">
        <div class="step-dot" :class="{ active: uploadStep >= 0, current: uploadStep === 0 }">
          <el-icon><Picture /></el-icon>
        </div>
        <div class="step-line" :class="{ active: uploadStep >= 1 }"></div>
        <div class="step-dot" :class="{ active: uploadStep >= 1, current: uploadStep === 1 }">
          <el-icon><Edit /></el-icon>
        </div>
        <div class="step-line" :class="{ active: uploadStep >= 2 }"></div>
        <div class="step-dot" :class="{ active: uploadStep >= 2, current: uploadStep === 2 }">
          <el-icon><Upload /></el-icon>
        </div>
      </div>

      <!-- 步骤1: 选择照片 -->
      <div v-if="uploadStep === 0" class="wizard-step step-select">
        <!-- 上传区域 -->
        <div class="upload-dropzone" @click="triggerFileInput" @drop.prevent="handleFileDrop" @dragover.prevent>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/*"
            style="display: none"
            @change="handleFileSelect"
          />
          <div class="dropzone-content">
            <div class="upload-icon-wrapper">
              <el-icon :size="56" class="upload-icon"><Upload /></el-icon>
            </div>
            <h3 class="upload-title">点击或拖拽上传照片</h3>
            <p class="upload-desc">支持 JPG、PNG、WebP 格式</p>
            <p class="upload-limit">最多可上传 100 张照片</p>
          </div>
        </div>

        <!-- 已选照片预览 -->
        <div v-if="uploadFiles.length > 0" class="selected-photos">
          <div class="photos-header">
            <span class="photos-count">已选择 {{ uploadFiles.length }} 张照片</span>
            <el-button type="danger" text size="small" @click="clearAllFiles">
              <el-icon><Delete /></el-icon>清空
            </el-button>
          </div>
          <div class="photos-grid">
            <div
              v-for="(file, index) in uploadFiles"
              :key="file.uid"
              class="photo-card"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragover.prevent
              @drop="handleDrop($event, index)"
            >
              <img :src="file.url || file.preview" />
              <div class="photo-overlay">
                <span class="photo-number">{{ index + 1 }}</span>
                <el-button class="delete-photo-btn" circle size="small" @click.stop="removeUploadFile(index)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
            <!-- 添加更多按钮 -->
            <div class="photo-card add-more" @click="triggerFileInput">
              <el-icon :size="32"><Plus /></el-icon>
            </div>
          </div>
          <p class="drag-tip">💡 拖拽照片可调整顺序</p>
        </div>
      </div>

      <!-- 步骤2: 编辑信息 -->
      <div v-if="uploadStep === 1" class="wizard-step step-edit">
        <!-- 批量编辑表单 -->
        <div class="batch-form">
          <h4 class="form-section-title">
            <el-icon><Document /></el-icon>
            批量设置
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>标题前缀</label>
              <el-input v-model="batchUploadForm.titlePrefix" placeholder="例如：旅行照片">
                <template #prefix><el-icon><Edit /></el-icon></template>
              </el-input>
            </div>
            <div class="form-group">
              <label>拍摄作者</label>
              <el-input v-model="batchUploadForm.author" placeholder="作者名称">
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </div>
            <div class="form-group full-width">
              <label>统一描述</label>
              <el-input
                v-model="batchUploadForm.description"
                type="textarea"
                :rows="2"
                placeholder="这组照片的共同描述..."
              />
            </div>
            <div class="form-group full-width">
              <label>标签</label>
              <el-select
                v-model="batchUploadForm.tags"
                multiple
                filterable
                allow-create
                placeholder="添加标签"
                style="width: 100%"
              >
                <el-option
                  v-for="tag in availableTags"
                  :key="tag.id"
                  :label="tag.name"
                  :value="tag.name"
                />
              </el-select>
            </div>
          </div>
        </div>

        <!-- 单张编辑 -->
        <div class="individual-edit">
          <h4 class="form-section-title">
            <el-icon><Collection /></el-icon>
            单独编辑（可选）
          </h4>
          <div class="edit-list">
            <div
              v-for="(file, index) in uploadFiles"
              :key="file.uid"
              class="edit-card"
            >
              <div class="edit-thumb">
                <img :src="file.url || file.preview" />
                <span class="thumb-number">{{ index + 1 }}</span>
              </div>
              <div class="edit-form">
                <el-input
                  v-model="file.customTitle"
                  size="small"
                  :placeholder="`${batchUploadForm.titlePrefix || '照片'} ${index + 1}`"
                />
                <el-input
                  v-model="file.customDescription"
                  size="small"
                  type="textarea"
                  :rows="2"
                  placeholder="描述..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤3: 上传进度 -->
      <div v-if="uploadStep === 2" class="wizard-step step-progress">
        <div class="progress-container">
          <div class="progress-icon" :class="uploadStatus">
            <el-icon v-if="uploadStatus === 'success'" :size="64" color="#67c23a"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="uploadStatus === 'exception'" :size="64" color="#f56c6c"><CircleCloseFilled /></el-icon>
            <el-icon v-else :size="64" color="#409eff"><Loading /></el-icon>
          </div>
          <h3 class="progress-title">{{ uploadStatus === 'success' ? '上传完成！' : uploadStatus === 'exception' ? '上传失败' : '正在上传...' }}</h3>
          <p class="progress-desc">{{ uploadStatusText }}</p>
          <el-progress
            :percentage="uploadProgress"
            :status="uploadStatus"
            :stroke-width="12"
            striped
            striped-flow
            class="upload-progress-bar"
          />
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="uploadStep > 0 && uploadStep < 2" @click="uploadStep--">
            <el-icon><ArrowLeft /></el-icon>上一步
          </el-button>
          <el-button
            v-if="uploadStep < 2"
            type="primary"
            @click="nextUploadStep"
            :disabled="uploadStep === 0 && uploadFiles.length === 0"
            class="next-btn"
          >
            {{ uploadStep === 1 ? '开始上传' : '下一步' }}
            <el-icon v-if="uploadStep === 0"><ArrowRight /></el-icon>
            <el-icon v-else><Upload /></el-icon>
          </el-button>
          <el-button v-if="uploadStep === 2 && uploadStatus === 'success'" type="success" @click="closeUploadWizard">
            <el-icon><Check /></el-icon>完成
          </el-button>
          <el-button v-if="uploadStep === 2 && uploadStatus === 'exception'" @click="retryUpload">
            <el-icon><RefreshRight /></el-icon>重试
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 键盘快捷键提示 -->
    <el-dialog v-model="shortcutHelpOpen" title="键盘快捷键" width="400px">
      <div class="shortcut-list">
        <div class="shortcut-item">
          <kbd>Space</kbd>
          <span>预览选中照片</span>
        </div>
        <div class="shortcut-item">
          <kbd>Esc</kbd>
          <span>退出批量模式 / 关闭面板</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>A</kbd>
          <span>全选</span>
        </div>
        <div class="shortcut-item">
          <kbd>Delete</kbd>
          <span>删除选中</span>
        </div>
        <div class="shortcut-item">
          <kbd>?</kbd>
          <span>显示快捷键帮助</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ENDPOINTS } from '@/api/api';
import { useUserStore } from '@/store/store';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api/interceptor';
import { 
  Picture, Plus, Edit, Delete, Search, Close, Check, 
  Grid, List, Sort, InfoFilled, Star, Upload, User,
  Document, Collection, ArrowLeft, ArrowRight, CircleCheckFilled,
  CircleCloseFilled, Loading, RefreshRight
} from '@element-plus/icons-vue';

// 类型定义
interface Tag {
  id: number;
  name: string;
}

interface Photo {
  id: number;
  path: string;
  author: string;
  title: string;
  description: string;
  likes: number;
  type: number;
  upload_time: string;
  tags: Tag[];
  userId: number;
  username?: string;
}

interface PhotoGroup {
  date: string;
  photos: Photo[];
}

// Store
const userStore = useUserStore();

// 数据状态
const photos = ref<Photo[]>([]);
const loading = ref(false);
const availableTags = ref<Tag[]>([]);

// 视图状态
const viewMode = ref<'grid' | 'list'>('grid');
const searchQuery = ref('');
const filterStatus = ref<number | null>(null);
const selectedTags = ref<string[]>([]);
const sortBy = ref<'newest' | 'oldest' | 'likes' | 'title'>('newest');

// 交互状态
const isBatchMode = ref(false);
const selectedPhotos = ref<Set<number>>(new Set());
const hoveredPhoto = ref<number | null>(null);
const detailPanelOpen = ref(false);
const selectedPhoto = ref<Photo | null>(null);
const shortcutHelpOpen = ref(false);

// 编辑表单
const editForm = ref<Partial<Photo>>({});
const tagInputVisible = ref(false);
const newTagName = ref('');
const tagInputRef = ref();

// 上传向导
const uploadWizardOpen = ref(false);
const uploadStep = ref(0);
const uploadFiles = ref<any[]>([]);
const uploadProgress = ref(0);
const uploadStatus = ref('');
const uploadStatusText = ref('准备上传...');
const fileInputRef = ref<HTMLInputElement | null>(null);
const batchUploadForm = ref({
  titlePrefix: '',
  author: userStore.nickname || userStore.username || '',
  description: '',
  tags: [] as string[]
});

// 计算属性
const filteredPhotos = computed(() => {
  let result = [...photos.value];
  
  // 非管理员只能看自己的
  if (!userStore.isAdmin) {
    result = result.filter(p => p.userId === userStore.userId);
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.name.toLowerCase().includes(q))
    );
  }
  
  // 状态过滤
  if (filterStatus.value !== null) {
    result = result.filter(p => p.type === filterStatus.value);
  }
  
  // 标签过滤
  if (selectedTags.value.length > 0) {
    result = result.filter(p => 
      selectedTags.value.every(tag => p.tags.some(t => t.name === tag))
    );
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
      case 'oldest':
        return new Date(a.upload_time).getTime() - new Date(b.upload_time).getTime();
      case 'likes':
        return b.likes - a.likes;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  
  return result;
});

const groupedPhotos = computed((): PhotoGroup[] => {
  const groups: Record<string, Photo[]> = {};
  
  filteredPhotos.value.forEach(photo => {
    const date = formatGroupDate(photo.upload_time);
    if (!groups[date]) groups[date] = [];
    groups[date].push(photo);
  });
  
  return Object.entries(groups)
    .map(([date, photos]) => ({ date, photos }))
    .sort((a, b) => {
      // 按日期降序
      const dateA = new Date(a.photos[0].upload_time);
      const dateB = new Date(b.photos[0].upload_time);
      return dateB.getTime() - dateA.getTime();
    });
});

const unselectedTags = computed(() => {
  return availableTags.value.filter(tag => !selectedTags.value.includes(tag.name));
});

const sortLabel = computed(() => {
  const labels: Record<string, string> = {
    newest: '最新上传',
    oldest: '最早上传',
    likes: '最多点赞',
    title: '名称排序'
  };
  return labels[sortBy.value];
});

const isAllSelected = computed(() => {
  return filteredPhotos.value.length > 0 && 
    filteredPhotos.value.every(p => selectedPhotos.value.has(p.id));
});

// 方法
const loadPhotos = async () => {
  loading.value = true;
  try {
    const res = await api.get<{ data: Photo[] }>(ENDPOINTS.ADMINSHOW);
    if (res.status === 200) {
      photos.value = res.data.data.map(p => ({
        ...p,
        type: Number(p.type),
        userId: p.userId || p.id
      }));
    }
  } catch (e: any) {
    ElMessage.error('加载照片失败');
  } finally {
    loading.value = false;
  }
};

const loadTags = async () => {
  try {
    const res = await api.get(ENDPOINTS.GETTAG);
    if (res.data.status === 830) {
      availableTags.value = res.data.data;
    }
  } catch (e) {}
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatGroupDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
};

const handleSort = (command: string) => {
  sortBy.value = command as any;
};

const addTagFilter = (tagName: string) => {
  if (!selectedTags.value.includes(tagName)) {
    selectedTags.value.push(tagName);
  }
};

const removeTagFilter = (tagName: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tagName);
};

// 选择和批量操作
const handlePhotoClick = (photo: Photo, event: MouseEvent) => {
  if (isBatchMode.value) {
    toggleSelection(photo.id);
  } else if (event.metaKey || event.ctrlKey) {
    isBatchMode.value = true;
    toggleSelection(photo.id);
  } else {
    openDetailPanel(photo);
  }
};

const toggleSelection = (id: number) => {
  if (selectedPhotos.value.has(id)) {
    selectedPhotos.value.delete(id);
  } else {
    selectedPhotos.value.add(id);
  }
  if (selectedPhotos.value.size === 0) {
    isBatchMode.value = false;
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedPhotos.value.clear();
    isBatchMode.value = false;
  } else {
    filteredPhotos.value.forEach(p => selectedPhotos.value.add(p.id));
    isBatchMode.value = true;
  }
};

const exitBatchMode = () => {
  isBatchMode.value = false;
  selectedPhotos.value.clear();
};

// 批量操作
const batchApprove = async () => {
  if (!userStore.isAdmin) return;
  
  const ids = Array.from(selectedPhotos.value);
  try {
    await Promise.all(ids.map(id => {
      const photo = photos.value.find(p => p.id === id);
      if (photo) {
        photo.type = 1;
        return api.post(ENDPOINTS.CHANGEPHOTOTYPE, { photo });
      }
    }));
    ElMessage.success('批量审核成功');
    exitBatchMode();
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedPhotos.value.size} 张照片吗？`,
      '确认删除',
      { type: 'warning' }
    );
    
    const ids = Array.from(selectedPhotos.value);
    await Promise.all(ids.map(id => 
      api.post(ENDPOINTS.DELETEPHOTO, { fileId: id })
    ));
    
    photos.value = photos.value.filter(p => !selectedPhotos.value.has(p.id));
    ElMessage.success('删除成功');
    exitBatchMode();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败');
  }
};

const batchEdit = () => {
  // 打开批量编辑对话框
  ElMessage.info('批量编辑功能开发中');
};

// 详情面板
const openDetailPanel = (photo: Photo) => {
  selectedPhoto.value = photo;
  editForm.value = { ...photo };
  detailPanelOpen.value = true;
};

const saveField = async (field: string) => {
  if (!selectedPhoto.value || !editForm.value.id) return;
  
  try {
    const res = await api.post(ENDPOINTS.ADMINUPDATE, editForm.value);
    if (res.data.status === 830) {
      const index = photos.value.findIndex(p => p.id === editForm.value.id);
      if (index !== -1) {
        photos.value[index] = { ...editForm.value } as Photo;
      }
      ElMessage.success('保存成功');
    }
  } catch (e) {
    ElMessage.error('保存失败');
  }
};

const showTagInput = () => {
  tagInputVisible.value = true;
  nextTick(() => tagInputRef.value?.focus());
};

const addTag = async () => {
  if (!newTagName.value.trim() || !selectedPhoto.value) return;
  
  const tagName = newTagName.value.trim();
  editForm.value.tags = [...(editForm.value.tags || []), { id: Date.now(), name: tagName }];
  
  try {
    await api.post(ENDPOINTS.ADDTAG, {
      filesId: selectedPhoto.value.id,
      tagName
    });
    saveField('tags');
  } catch (e) {
    ElMessage.error('添加标签失败');
  }
  
  tagInputVisible.value = false;
  newTagName.value = '';
};

const removeTag = async (index: number) => {
  if (!editForm.value.tags || !selectedPhoto.value) return;
  
  const tag = editForm.value.tags[index];
  try {
    await api.post(ENDPOINTS.DELETEPHOTOTAG, {
      filesId: selectedPhoto.value.id,
      tagId: tag.id
    });
    editForm.value.tags.splice(index, 1);
    saveField('tags');
  } catch (e) {
    ElMessage.error('删除标签失败');
  }
};

// 快速操作
const quickEdit = (photo: Photo) => {
  openDetailPanel(photo);
};

const confirmDelete = async (photo: Photo) => {
  try {
    await ElMessageBox.confirm('确定要删除这张照片吗？', '确认删除', { type: 'warning' });
    await api.post(ENDPOINTS.DELETEPHOTO, { fileId: photo.id });
    photos.value = photos.value.filter(p => p.id !== photo.id);
    if (selectedPhoto.value?.id === photo.id) {
      detailPanelOpen.value = false;
    }
    ElMessage.success('删除成功');
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败');
  }
};

// 上传向导
const openUploadWizard = () => {
  uploadWizardOpen.value = true;
  uploadStep.value = 0;
  uploadFiles.value = [];
  uploadProgress.value = 0;
  uploadStatus.value = '';
  uploadStatusText.value = '准备上传...';
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    Array.from(input.files).forEach(file => {
      const uploadFile = {
        uid: Date.now() + Math.random(),
        name: file.name,
        raw: file,
        url: URL.createObjectURL(file),
        preview: URL.createObjectURL(file),
        customTitle: '',
        customDescription: ''
      };
      uploadFiles.value.push(uploadFile);
    });
  }
  // 重置 input 以便可以再次选择相同文件
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const handleFileDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (files) {
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const uploadFile = {
        uid: Date.now() + Math.random(),
        name: file.name,
        raw: file,
        url: URL.createObjectURL(file),
        preview: URL.createObjectURL(file),
        customTitle: '',
        customDescription: ''
      };
      uploadFiles.value.push(uploadFile);
    });
  }
};

const clearAllFiles = () => {
  uploadFiles.value.forEach(file => {
    URL.revokeObjectURL(file.url);
  });
  uploadFiles.value = [];
};

const retryUpload = () => {
  uploadStatus.value = '';
  uploadProgress.value = 0;
  uploadStatusText.value = '准备上传...';
  startUpload();
};

const closeUploadWizard = () => {
  // 清理 URL 对象
  uploadFiles.value.forEach(file => {
    if (file.url) URL.revokeObjectURL(file.url);
  });
  uploadWizardOpen.value = false;
  loadPhotos();
};

const removeUploadFile = (index: number) => {
  const file = uploadFiles.value[index];
  if (file.url) URL.revokeObjectURL(file.url);
  uploadFiles.value.splice(index, 1);
};

const handleDragStart = (e: DragEvent, index: number) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', String(index));
  }
};

const handleDrop = (e: DragEvent, targetIndex: number) => {
  const sourceIndex = Number(e.dataTransfer?.getData('text/plain'));
  if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
    const item = uploadFiles.value.splice(sourceIndex, 1)[0];
    uploadFiles.value.splice(targetIndex, 0, item);
  }
};

const nextUploadStep = async () => {
  if (uploadStep.value === 1) {
    // 开始上传
    uploadStep.value = 2;
    await startUpload();
  } else {
    uploadStep.value++;
  }
};

const startUpload = async () => {
  uploadStatusText.value = '正在上传文件...';
  
  try {
    // 上传文件
    const urls: string[] = [];
    for (let i = 0; i < uploadFiles.value.length; i++) {
      const file = uploadFiles.value[i];
      const formData = new FormData();
      formData.append('namespace', 'blog/atlas');
      formData.append('file', file.raw);
      
      const res = await api.post(ENDPOINTS.FILE.UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data?.url) {
        urls.push(res.data.url);
      }
      
      uploadProgress.value = Math.round(((i + 1) / uploadFiles.value.length) * 50);
    }
    
    uploadStatusText.value = '正在保存信息...';
    
    // 提交照片信息
    for (let i = 0; i < urls.length; i++) {
      const file = uploadFiles.value[i];
      const data = {
        title: file.customTitle || `${batchUploadForm.value.titlePrefix || '照片'} ${i + 1}`,
        author: batchUploadForm.value.author || '佚名',
        description: file.customDescription || batchUploadForm.value.description || '无',
        userId: userStore.userId,
        urls: [urls[i]],
        tags: batchUploadForm.value.tags
      };
      
      await api.post(ENDPOINTS.UPLOAD, data);
      uploadProgress.value = 50 + Math.round(((i + 1) / urls.length) * 50);
    }
    
    uploadStatus.value = 'success';
    uploadStatusText.value = '上传完成！';
    ElMessage.success('上传成功');
  } catch (e: any) {
    uploadStatus.value = 'exception';
    uploadStatusText.value = '上传失败: ' + e.message;
    ElMessage.error('上传失败');
  }
};

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  // ? 显示帮助
  if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
    shortcutHelpOpen.value = true;
    return;
  }
  
  // Esc 退出
  if (e.key === 'Escape') {
    if (detailPanelOpen.value) {
      detailPanelOpen.value = false;
    } else if (isBatchMode.value) {
      exitBatchMode();
    }
    return;
  }
  
  // Ctrl+A 全选
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
    e.preventDefault();
    toggleSelectAll();
    return;
  }
  
  // Delete 删除
  if (e.key === 'Delete' && isBatchMode.value && selectedPhotos.value.size > 0) {
    batchDelete();
  }
};

// 生命周期
onMounted(() => {
  loadPhotos();
  loadTags();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// 监听搜索变化
watch(searchQuery, () => {
  // 防抖搜索
});
</script>

<style scoped>
.photo-manager {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
  overflow-x: hidden;
}

/* 野兽派背景 */
.photo-manager::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

.grid-background {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(rgba(0,0,0,0.015) 2px, transparent 2px),
    linear-gradient(90deg, rgba(0,0,0,0.015) 2px, transparent 2px);
  background-size: 25px 25px, 25px 25px, 100px 100px, 100px 100px;
  pointer-events: none;
  z-index: 0;
}

.geo-element {
  position: fixed;
  pointer-events: none;
  z-index: 0;
}

.geo-1 {
  width: 120px;
  height: 120px;
  border: 3px solid #0a0a0a;
  top: 8%;
  right: 3%;
  transform: rotate(15deg);
  opacity: 0.1;
}

.geo-2 {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 80px solid #ff6b6b;
  bottom: 12%;
  left: 5%;
  opacity: 0.15;
}

.geo-3 {
  width: 50px;
  height: 50px;
  background: #00b4d8;
  top: 18%;
  left: 8%;
  opacity: 0.2;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  gap: 16px;
}

.toolbar.batch-active {
  background: #ecf5ff;
  border-bottom-color: #409eff;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.photo-count {
  font-size: 14px;
  font-weight: normal;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 10px;
  border-radius: 12px;
}

.toolbar-center {
  flex: 1;
  max-width: 480px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #909399;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 40px;
  border: 1px solid #dcdfe6;
  border-radius: 24px;
  font-size: 14px;
  transition: all 0.3s;
  background: #f5f7fa;
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
  background: white;
}

.clear-icon {
  position: absolute;
  right: 12px;
  color: #909399;
  cursor: pointer;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  justify-content: flex-end;
}

.view-toggle {
  border-radius: 8px;
  overflow: hidden;
}

.upload-btn {
  border-radius: 20px;
  padding: 10px 20px;
}

/* 批量模式工具栏 */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.batch-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.batch-count {
  font-size: 16px;
  font-weight: 500;
  color: #409eff;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.filter-chips {
  display: flex;
  gap: 8px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-chip.active {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.approved {
  background: #67c23a;
}

.status-dot.pending {
  background: #e6a23c;
}

.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #909399;
}

.selected-tag {
  margin-right: 0;
}

/* 内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  position: relative;
  z-index: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-illustration {
  color: #dcdfe6;
  margin-bottom: 20px;
}

/* 网格视图 */
.grid-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.photo-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.group-count {
  font-size: 14px;
  color: #909399;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.photo-item {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
  cursor: pointer;
}

.photo-item:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.photo-item.is-selected {
  box-shadow: 0 0 0 3px #409eff;
}

.selection-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.selection-indicator.is-visible {
  opacity: 1;
}

.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255,255,255,0.8);
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox.is-checked {
  background: #409eff;
  border-color: #409eff;
}

.photo-thumb {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.photo-item:hover .photo-thumb img {
  transform: scale(1.05);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.photo-item:hover .photo-overlay {
  opacity: 1;
}

.overlay-actions {
  display: flex;
  gap: 12px;
}

.photo-badges {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge.pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.badge.likes {
  background: rgba(0,0,0,0.6);
  color: white;
}

.photo-info {
  padding: 12px 16px;
}

.photo-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-meta {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

/* 列表视图 */
.list-view {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background 0.2s;
}

.list-item:hover {
  background: #f5f7fa;
}

.list-item.is-selected {
  background: #ecf5ff;
}

.list-cell {
  padding: 0 12px;
}

.checkbox-cell {
  width: 40px;
  padding-left: 0;
}

.thumb-cell {
  width: 80px;
  padding-left: 0;
}

.thumb-cell img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
}

.info-cell {
  flex: 1;
  min-width: 200px;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px 0;
}

.item-author {
  font-size: 13px;
  color: #606266;
  margin: 0 0 8px 0;
}

.item-tags {
  display: flex;
  gap: 6px;
}

.more-tags {
  font-size: 12px;
  color: #909399;
}

.meta-cell {
  width: 160px;
  font-size: 13px;
  color: #606266;
}

.status-cell {
  width: 100px;
}

.actions-cell {
  width: 120px;
  display: flex;
  gap: 4px;
}

/* 详情面板 */
.detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 24px rgba(0,0,0,0.1);
  z-index: 1100;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.panel-preview {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
}

.panel-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.panel-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-tag {
  margin-right: 0;
}

.admin-only {
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.panel-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-label {
  color: #909399;
}

.meta-value {
  color: #606266;
}

.panel-footer {
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
}

/* 面板动画 */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.3s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
}

/* ========== 上传向导样式 ========== */

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 0 24px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 24px;
}

.step-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  color: #909399;
  font-size: 18px;
}

.step-dot.active {
  background: #409eff;
  color: white;
}

.step-line {
  flex: 1;
  max-width: 80px;
  height: 2px;
  background: #e4e7ed;
}

.step-line.active {
  background: #409eff;
}

/* 步骤容器 */
.wizard-step {
  padding: 0;
}

/* ===== 步骤1: 选择照片 ===== */
.step-select {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 上传拖拽区 */
.upload-dropzone {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  background: #f8fafc;
  padding: 40px;
  text-align: center;
  cursor: pointer;
}

.upload-dropzone:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon-wrapper {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  color: #606266;
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.upload-desc {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.upload-limit {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 4px 12px;
  border-radius: 4px;
}

/* 已选照片区域 */
.selected-photos {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.photos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.photos-count {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}

.photo-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: move;
  border: 1px solid #e4e7ed;
}

.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-card.add-more {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border: 2px dashed #dcdfe6;
  color: #909399;
  cursor: pointer;
}

.photo-card.add-more:hover {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 6px;
  opacity: 0;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.photo-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.delete-photo-btn {
  width: 24px;
  height: 24px;
  background: white;
  border: none;
}

.drag-tip {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin: 10px 0 0 0;
}

/* ===== 步骤2: 编辑信息 ===== */
.step-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.batch-form {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-grid .full-width {
  grid-column: span 2;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.individual-edit {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.edit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.edit-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.edit-thumb {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.edit-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-number {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ===== 步骤3: 上传进度 ===== */
.step-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.progress-container {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.progress-icon {
  margin-bottom: 20px;
}

.progress-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.progress-desc {
  font-size: 14px;
  color: #606266;
  margin: 0 0 20px 0;
}

.upload-progress-bar {
  margin-top: 12px;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 快捷键帮助 */
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shortcut-item kbd {
  min-width: 60px;
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  text-align: center;
}

.shortcut-item span {
  color: #606266;
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .toolbar-center {
    order: 3;
    max-width: none;
    width: 100%;
  }

  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .detail-panel {
    width: 100%;
  }

  .filter-bar {
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  /* 上传对话框 */
  :deep(.upload-wizard) {
    width: 95% !important;
    max-width: 95vw !important;
    margin: 10px auto !important;
    border-radius: 8px;
  }

  :deep(.upload-wizard .el-dialog__body) {
    padding: 16px;
  }

  /* 步骤指示器 */
  .step-indicator {
    padding: 0 0 16px 0;
    margin-bottom: 16px;
  }

  .step-dot {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .step-line {
    max-width: 40px;
  }

  /* 上传区域 */
  .upload-dropzone {
    padding: 24px 16px;
  }

  .upload-icon-wrapper {
    width: 56px;
    height: 56px;
  }

  .upload-title {
    font-size: 16px;
  }

  /* 照片网格 */
  .photos-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 8px;
  }

  /* 表单网格 */
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid .full-width {
    grid-column: span 1;
  }

  .batch-form,
  .individual-edit {
    padding: 12px;
  }

  .edit-list {
    max-height: 220px;
  }

  .edit-thumb {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .photo-grid {
    grid-template-columns: 1fr;
  }

  .geo-element {
    display: none;
  }

  /* 全屏对话框 */
  :deep(.upload-wizard) {
    width: 100% !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: flex;
    flex-direction: column;
  }

  :deep(.upload-wizard .el-dialog__header) {
    padding: 12px 16px;
    flex-shrink: 0;
  }

  :deep(.upload-wizard .el-dialog__body) {
    padding: 12px;
    flex: 1;
    overflow-y: auto;
  }

  :deep(.upload-wizard .el-dialog__footer) {
    padding: 10px 12px;
    flex-shrink: 0;
    border-top: 1px solid #e4e7ed;
  }

  /* 步骤指示器 */
  .step-indicator {
    padding: 0 0 12px 0;
    margin-bottom: 12px;
  }

  .step-dot {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  /* 上传区域 */
  .upload-dropzone {
    padding: 20px 12px;
    border-radius: 6px;
  }

  .upload-icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .upload-title {
    font-size: 15px;
  }

  .upload-desc {
    font-size: 12px;
  }

  /* 照片网格 3列 */
  .photos-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .photo-card {
    border-radius: 4px;
  }

  .selected-photos {
    padding: 10px;
  }

  /* 编辑卡片 */
  .edit-card {
    padding: 8px;
    gap: 8px;
  }

  .edit-thumb {
    width: 50px;
    height: 50px;
  }

  .edit-list {
    max-height: 180px;
  }

  .batch-form,
  .individual-edit {
    padding: 10px;
    border-radius: 6px;
  }

  /* 底部按钮 */
  .dialog-footer {
    gap: 8px;
  }

  .dialog-footer .el-button {
    flex: 1;
    padding: 8px 12px;
  }
}

/* 深色主题 */
.dark .photo-manager {
  background: #0a0a0a;
}

.dark .photo-manager::before {
  opacity: 0.02;
}

.dark .grid-background {
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 2px, transparent 2px);
}

.dark .geo-1 {
  border-color: #fff;
  opacity: 0.08;
}

.dark .geo-2 {
  border-bottom-color: #e94560;
  opacity: 0.2;
}

.dark .geo-3 {
  background: #00b4d8;
  opacity: 0.15;
}

.dark .toolbar,
.dark .filter-bar {
  background: #242424;
  border-color: #333;
}

.dark .page-title,
.dark .group-title {
  color: #e4e7ed;
}

.dark .photo-item,
.dark .list-view {
  background: #242424;
}

.dark .photo-title {
  color: #e4e7ed;
}

.dark .search-input {
  background: #333;
  border-color: #444;
  color: #e4e7ed;
}

.dark .filter-chip {
  background: #333;
  border-color: #444;
  color: #b0b3b8;
}

.dark .detail-panel {
  background: #242424;
}

.dark .panel-form label {
  color: #b0b3b8;
}

.dark .panel-meta {
  background: #333;
}

/* 暗黑模式 - 上传向导 */
.dark .step-indicator {
  border-color: #333;
}

.dark .step-dot {
  background: #2a2a2a;
  color: #666;
}

.dark .step-dot.active {
  background: #409eff;
  color: white;
}

.dark .step-line {
  background: #333;
}

.dark .step-line.active {
  background: #409eff;
}

.dark .upload-dropzone {
  background: linear-gradient(135deg, #1a1a1a 0%, #242424 100%);
  border-color: #333;
}

.dark .upload-dropzone:hover {
  border-color: #00b4d8;
  background: linear-gradient(135deg, #1a2a3a 0%, #243444 100%);
}

.dark .upload-title {
  color: #e4e7ed;
}

.dark .upload-desc {
  color: #999;
}

.dark .upload-icon {
  color: #b0b3b8;
}

.dark .upload-limit {
  background: rgba(255,255,255,0.05);
  color: #666;
}

.dark .selected-photos {
  background: #1a1a1a;
}

.dark .photos-count {
  color: #e4e7ed;
}

.dark .photo-card.add-more {
  background: #2a2a2a;
  border-color: #333;
  color: #666;
}

.dark .photo-card.add-more:hover {
  border-color: #409eff;
  color: #409eff;
  background: #1a2a3a;
}

.dark .batch-form,
.dark .individual-edit {
  background: #1a1a1a;
}

.dark .form-section-title {
  color: #e4e7ed;
}

.dark .edit-card {
  background: #242424;
}

.dark .form-group label {
  color: #999;
}

.dark .progress-title {
  color: #e4e7ed;
}

.dark .progress-desc {
  color: #999;
}

@media (max-width: 480px) {
  .dark :deep(.upload-wizard .el-dialog__footer) {
    border-color: #333;
  }
}
</style>
