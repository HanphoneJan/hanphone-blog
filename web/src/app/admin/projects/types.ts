'use client'

// 项目类型选项接口
export interface ProjectType {
  id: number
  name: string
}

// 项目接口
export interface Project {
  id: number | null
  content: string
  title: string
  pic_url: string
  url: string
  type: number
  techs: string
  recommend?: boolean
  inputVisible?: boolean
  inputValue?: string
  editingTitle?: boolean
  editingContent?: boolean
  editingImage?: boolean
  editingUrl?: boolean
  tempTitle?: string
  tempContent?: string
  tempImageUrl?: string
  tempUrl?: string
  created_at?: string
  updated_at?: string
}

// 项目表单数据类型
export interface ProjectFormData {
  title: string
  content: string
  url: string
  techs: string
  type: number
}

// 项目统计数据类型
export interface ProjectStats {
  total: number
  byType: Record<number, number>
  recommended: number
}

// 筛选器类型
export interface ProjectFilters {
  type: number
  searchQuery: string
  status: 'all' | 'recommended' | 'unrecommended'
  sortBy: 'created' | 'name' | 'progress'
  sortOrder: 'asc' | 'desc'
}

// 本地输入值类型
export interface LocalInputValues {
  [key: number]: {
    title?: string
    content?: string
    imageUrl?: string
    url?: string
    techInput?: string
  }
}

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message?: string
}
