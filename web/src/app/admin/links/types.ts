// 友链类型定义

// 友链类型选项
export interface FriendLinkType {
  id: string
  name: string
}

// 友链数据结构
export interface FriendLink {
  id: number | null
  type: string
  name: string
  description: string
  link_url?: string
  url: string
  avatar: string
  color: string
  recommend: boolean
  createTime?: string
  // 编辑状态字段
  inputVisible?: boolean
  inputValue?: string
  editingName?: boolean
  editingDescription?: boolean
  editingAvatar?: boolean
  editingUrl?: boolean
  editingColor?: boolean
  // 临时字段
  tempName?: string
  tempDescription?: string
  tempAvatar?: string
  tempUrl?: string
  tempColor?: string
}

// 表单值类型
export interface FormValues {
  name: string
  description: string
  url: string
  type: string
  color: string
}

// 筛选条件类型
export interface FilterState {
  type: string
  searchQuery: string
}

// 本地输入值类型
export interface LocalInputValues {
  [key: number]: {
    name?: string
    description?: string
    avatar?: string
    url?: string
    color?: string
  }
}

// 友链类型选项
export const LINK_TYPES: FriendLinkType[] = [
  { id: 'friend', name: '朋友' },
  { id: 'resource', name: '资源' },
  { id: 'tool', name: '工具' },
  { id: 'blog', name: '文章' },
  { id: 'other', name: '其他' }
]

// 默认友链数据
export const DEFAULT_FRIEND_LINK: Omit<FriendLink, 'id'> = {
  type: '',
  name: '',
  description: '',
  url: '',
  avatar: '',
  color: '',
  recommend: false,
  createTime: new Date().toISOString()
}

// 默认表单值
export const DEFAULT_FORM_VALUES: FormValues = {
  name: '',
  description: '',
  url: '',
  type: '',
  color: ''
}

// 默认筛选条件
export const DEFAULT_FILTERS: FilterState = {
  type: '',
  searchQuery: ''
}
