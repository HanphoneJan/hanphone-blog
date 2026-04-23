/**
 * 首页类型定义
 */

// 博客接口
export interface Blog {
  id: number
  title: string
  description: string
  firstPicture: string
  createTime: string
  views: number
  recommend: boolean
  published: boolean
  type: {
    id: number
    name: string
  }
  user: {
    avatar: string
    nickname: string
  }
  tags?: Tag[]
}

// 分类接口
export interface Type {
  id: number
  name: string
  pic_url: string
  blogs: Blog[]
}

// 标签接口
export interface Tag {
  id: number
  name: string
  blogs: Blog[]
}

// API响应通用类型
export interface ApiResponse<T> {
  data: T
}

// 分页数据类型
export interface PagedResponse<T> {
  content: T[]
  totalElements: number
}

// 缓存接口
export interface CacheItem<T> {
  data: T
  timestamp: number
}

// 首页分页查询参数
export interface HomeQueryInfo {
  query: string
  pagenum: number
  pagesize: number
}

// 项目类型（前台使用）
export interface Project {
  id: number
  title: string
  description: string
  url: string
  cover: string
  type: 'project' | 'tool' | 'game' | 'practice'
  tags: string[]
  order: number
  createTime: string
  recommend?: boolean
}

// 随笔类型（前台使用，精简版）
export interface Essay {
  id: number
  content: string
  createTime: string
  nickname: string
  avatar: string
  likes: number
  recommend?: boolean
}

// 站点统计
export interface SiteStats {
  blogCount: number
  essayCount: number
  projectCount: number
}

// 分页布局类型
export type PaginationLayout = 'compact' | 'full'

// 加载状态类型
export interface LoadingState {
  blogList: boolean
  recommendList: boolean
  typeList: boolean
  tagList: boolean
}

// 可见性状态类型
export interface VisibilityState {
  blogList: boolean
  recommendList: boolean
  typeList: boolean
  tagList: boolean
}
