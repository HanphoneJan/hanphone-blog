# 📘 前端技术文档 | Frontend Documentation

本文档详细介绍照片墙项目的前端架构、开发规范和组件说明。

## 📑 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发规范](#开发规范)
- [路由系统](#路由系统)
- [状态管理](#状态管理)
- [API接口](#api接口)
- [组件说明](#组件说明)
- [PWA配置](#pwa配置)
- [构建部署](#构建部署)

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.13 | 核心框架 |
| TypeScript | 5.6.2 | 类型安全 |
| Vite | 6.0.5 | 构建工具 |
| Pinia | 2.3.0 | 状态管理 |
| Element Plus | 2.9.1 | UI组件库 |
| Vue Router | 4.5.0 | 路由管理 |
| Axios | 1.7.9 | HTTP请求 |
| v-viewer | 3.0.21 | 图片预览 |
| vue-i18n | 10.0.5 | 国际化 |

## 项目结构

```
src/
├── api/                      # API接口配置
│   ├── api.ts               # 接口地址定义
│   └── interceptor.ts       # 请求拦截器（Token处理、错误处理）
├── assets/                   # 静态资源（图片、字体等）
├── components/               # Vue组件
│   ├── Atlas.vue            # 照片墙主组件（瀑布流展示）
│   ├── NotFound.vue         # 404页面
│   ├── admin/               # 后台管理组件
│   │   ├── AdminAtlas.vue   # 照片管理
│   │   ├── AdminTag.vue     # 标签管理
│   │   └── AdminUser.vue    # 用户管理
│   ├── layout/              # 布局组件
│   └── login/               # 登录相关组件
│       ├── Login.vue
│       └── ForgotPassword.vue
├── router/
│   └── router.ts            # 路由配置
├── store/
│   └── store.ts             # Pinia状态管理（用户信息、登录状态）
├── styles/                   # 全局样式
├── utils/                    # 工具函数
├── views/                    # 页面视图
│   ├── Home.vue             # 首页（包含Atlas组件）
│   └── AdminHome.vue        # 管理后台框架
├── App.vue                   # 根组件
├── main.ts                   # 入口文件
└── vite.d.ts                 # Vite类型声明
```

## 开发规范

### 代码风格

- 使用 **TypeScript** 进行类型定义
- 使用 **Composition API** 编写组件
- 组件名使用 PascalCase（如 `AdminAtlas.vue`）
-  composable 函数使用 camelCase，以 `use` 开头

### 组件模板

```vue
<template>
  <div class="component-name">
    <!-- 模板内容 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/store'

// Props定义
interface Props {
  title?: string
}
const props = withDefaults(defineProps<Props>(), {
  title: '默认标题'
})

// Emits定义
const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

// 状态
const loading = ref(false)
const userStore = useUserStore()

// 方法
const handleClick = () => {
  // 处理逻辑
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.component-name {
  /* 组件样式 */
}
</style>
```

### 路径别名

```typescript
// vite.config.ts 中配置
'@': path.resolve(__dirname, 'src')

// 使用示例
import { useUserStore } from '@/store/store'
import Atlas from '@/components/Atlas.vue'
```

## 路由系统

### 路由配置

```typescript
// src/router/router.ts
const routes = [
  {
    path: '/',
    component: Welcome,
    redirect: '/index',
    children: [
      { path: '/index', name: 'Index', component: Atlas }
    ]
  },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Login },
  {
    path: '/admin',
    component: AdminHome,
    meta: { requiresAuth: true },
    children: [
      { path: 'atlas', name: 'AdminAtlas', component: AdminAtlas },
      { path: 'user', name: 'AdminUser', component: AdminUser },
      { path: 'tag', name: 'AdminTag', component: AdminTag }
    ]
  },
  { path: '/:pathMatch(.*)*', component: NotFound }
]
```

### 路由守卫

```typescript
// 全局路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  // 管理后台需要登录
  if (to.path.startsWith('/admin')) {
    if (userStore.isLoggedIn) {
      next()
    } else {
      next({ name: 'Login' })
    }
  } else {
    next()
  }
})
```

### 路由说明

| 路径 | 名称 | 组件 | 权限 | 说明 |
|------|------|------|------|------|
| `/` | - | Welcome | 公开 | 首页框架 |
| `/index` | Index | Atlas | 公开 | 照片墙展示 |
| `/login` | Login | Login | 公开 | 登录页面 |
| `/register` | Register | Login | 公开 | 注册页面（复用Login） |
| `/forgotpassword` | ForgotPassword | ForgotPassword | 公开 | 找回密码 |
| `/admin` | - | AdminHome | 需登录 | 管理后台框架 |
| `/admin/atlas` | AdminAtlas | AdminAtlas | 需登录 | 照片管理 |
| `/admin/user` | AdminUser | AdminUser | 需登录 | 用户管理 |
| `/admin/tag` | AdminTag | AdminTag | 需登录 | 标签管理 |
| `/*` | - | NotFound | 公开 | 404页面 |

## 状态管理

### Pinia Store

```typescript
// src/store/store.ts
export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    username: null,
    isAdmin: false,
    token: null,
    userId: null,
    // ... 其他用户信息
  }),
  actions: {
    login(userData, token, expire) {
      // 登录逻辑
    },
    logout() {
      // 登出逻辑
    }
  }
})
```

### 状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `isLoggedIn` | boolean | 登录状态 |
| `username` | string\|null | 用户名 |
| `isAdmin` | boolean | 是否为管理员 |
| `token` | string\|null | JWT令牌 |
| `userId` | string\|null | 用户ID |
| `theme` | string | 主题（light/dark） |
| `language` | string | 语言（zh-cn/en） |

## API接口

### 接口配置

```typescript
// src/api/api.ts
export const API_BASE_URL = 'https://hanphone.cn/nodejs/atlas'
export const BLOG_BASE_URL = 'https://hanphone.cn/api'

export const ENDPOINTS = {
  LOGIN: `${BLOG_BASE_URL}/login`,
  SHOW: `${API_BASE_URL}/show`,
  UPLOAD: `${API_BASE_URL}/upload`,
  LIKES: `${API_BASE_URL}/likes`,
  SEARCH: `${API_BASE_URL}/search`,
  GETTAG: `${API_BASE_URL}/getTag`,
  // ... 管理接口
  ADMINSHOW: `${API_BASE_URL}/admin/adminShow`,
  DELETEPHOTO: `${API_BASE_URL}/admin/deletePhoto`,
  // ...
}
```

### 请求拦截器

```typescript
// src/api/interceptor.ts
import axios from 'axios'
import { useUserStore } from '@/store/store'

// 请求拦截
axios.interceptors.request.use(config => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

// 响应拦截
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token过期，跳转登录
      const userStore = useUserStore()
      userStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

## 页面设计风格

照片墙采用**新野兽派（Neo-Brutalism）**设计美学，这是一种强调原始感、高对比度和手工质感的设计风格：

### 设计特点

| 元素 | 说明 |
|------|------|
| **高对比配色** | 鲜艳便利贴色（红、青、黄、蓝、粉、紫）搭配深色边框 |
| **粗粝边框** | 4px 实线边框，打破传统细线设计 |
| **硬阴影** | 8px 偏移阴影，营造立体印刷效果 |
| **胶带装饰** | 半透明胶带元素，模拟真实便利贴 |
| **噪点纹理** | 细微噪点叠加，增加复古质感 |
| **几何图形** | 背景装饰性几何元素（方块、三角形、圆形）|

## 双布局系统

Atlas 组件内置两种布局模式，通过 `viewMode` 状态切换：

### 1. 便利贴布局（Brutalist）- 默认

```typescript
const viewMode = ref<'masonry' | 'brutalist'>('brutalist');
```

**视觉特征**：
- 8种鲜艳便利贴配色（`#ff6b6b`、`#4ecdc4`、`#ffe066` 等）
- 每张卡片 2°~2° 随机旋转，错落有致
- 顶部胶带装饰效果
- 4px 粗边框 + 8px 硬阴影
- 网格背景叠加噪点纹理

**交互效果**：
- 悬停时卡片归零旋转并上浮
- 阴影加深，突出当前卡片
- 图片缩放预览

**适用场景**：艺术展示、创意灵感、个人作品集

### 2. 瀑布流布局（Masonry）

**视觉特征**：
- CSS Columns 多列瀑布流
- 无间隙图片拼接
- 悬停显示渐变遮罩和信息
- 极简主义设计

**交互效果**：
- 悬停显示标题、作者、标签
- 操作按钮渐显（放大、下载、点赞）
- 图片轻微放大

**适用场景**：摄影作品、风景图片、需要沉浸式浏览的内容

### 布局切换

```typescript
// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'masonry' ? 'brutalist' : 'masonry';
  localStorage.setItem('atlasViewMode', viewMode.value);
};
```

用户偏好的布局会自动保存到 `localStorage`，下次访问时恢复。

## 组件说明

### Atlas.vue

照片墙核心组件，支持双布局切换展示。

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| - | - | - | 无外部Props，数据通过API获取 |

**Features:**
- 双布局切换（便利贴/瀑布流）
- 标签筛选
- 图片预览（自定义遮罩层）
- 点赞功能
- 响应式布局适配

### AdminAtlas.vue

管理后台照片管理组件。

**Features:**
- 照片列表展示
- 照片审核（改变type状态）
- 照片删除
- 标签编辑

### AdminUser.vue

用户管理组件。

**Features:**
- 用户列表
- 用户信息修改
- 用户删除

### AdminTag.vue

标签管理组件。

**Features:**
- 标签列表
- 创建标签
- 删除标签

## PWA配置

### Vite PWA配置

```typescript
// vite.config.ts
VitePWA({
  scope: '/atlas/',
  registerType: 'autoUpdate',
  manifest: {
    name: '寒枫的照片墙',
    short_name: '照片墙',
    icons: [
      {
        src: 'https://hanphone.top/blog/atlas/icon.png',
        sizes: '144x144'
      }
    ]
  },
  workbox: {
    cacheId: 'atlas-cache',
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|svg)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'atlas-image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 3
          }
        }
      }
    ]
  }
})
```

### PWA特性

- **离线访问**：缓存核心资源
- **自动更新**：Service Worker自动更新
- **图片缓存**：智能图片缓存策略
- **添加到桌面**：支持安装为桌面应用

## 构建部署

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
# 或
vite

# 开发服务器地址
http://localhost:3000
```

### 生产构建

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 构建输出

```
atlas/                         # 输出目录
├── assets/
│   ├── js/                   # JS文件
│   └── [name].[ext]          # 静态资源
├── index.html
└── manifest.webmanifest      # PWA清单
```

### 部署配置

```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/atlas/' : '/',
  // ...
})
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `NODE_ENV` | 环境模式（development/production） |
| `VITE_API_BASE_URL` | API基础地址 |

## 常见问题

### Q: 如何切换API环境？

编辑 `src/api/api.ts` 修改 `API_BASE_URL`：

```typescript
// 开发环境
export const API_BASE_URL = 'http://localhost:4001'

// 生产环境
export const API_BASE_URL = 'https://hanphone.cn/nodejs/atlas'
```

### Q: PWA缓存如何清理？

每次构建会自动生成新的 `cacheId`，Workbox会自动清理旧缓存。

### Q: 如何添加新页面？

1. 在 `src/views/` 创建页面组件
2. 在 `src/router/router.ts` 添加路由
3. 如需导航菜单，在对应布局组件中添加链接
