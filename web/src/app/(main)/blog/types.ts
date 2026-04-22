/**
 * 博客页面共享类型定义
 */

export interface Blog {
  id: number
  title: string
  description: string
  firstPicture: string
  createTime: string
  views: number
  recommend: boolean
  type: {
    id: number
    name: string
  }
  user: {
    avatar: string
    nickname: string
  }
}

export interface Type {
  id: number
  name: string
}

export interface Tag {
  id: number
  name: string
  blogCount?: number
}

export interface PageInfo {
  current: number
  size: number
  total: number
  totalPages: number
}

// 按分类分组的博客摘要（用于左侧二级导航）
export interface BlogsByType {
  [typeId: number]: { id: number; title: string }[]
}
