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
  siteshot?: string      // 站点截图URL
  rss?: string           // RSS订阅地址
  nickname?: string      // 站长昵称
  color: string
  recommend: boolean
  published?: boolean    // 是否已审核发布
  applyText?: string     // 申请原始文本
  createTime?: string
  // 编辑状态字段
  inputVisible?: boolean
  inputValue?: string
  editingName?: boolean
  editingDescription?: boolean
  editingAvatar?: boolean
  editingSiteshot?: boolean
  editingRss?: boolean
  editingNickname?: boolean
  editingUrl?: boolean
  editingColor?: boolean
  // 临时字段
  tempName?: string
  tempDescription?: string
  tempAvatar?: string
  tempSiteshot?: string
  tempRss?: string
  tempNickname?: string
  tempUrl?: string
  tempColor?: string
}

// 表单值类型
export interface FormValues {
  name: string
  description: string
  url: string
  link_url?: string
  type: string
  color: string
  avatar?: string
  siteshot?: string
  rss?: string
  nickname?: string
}

// 筛选条件类型
export interface FilterState {
  type: string
  searchQuery: string
  published: '' | 'true' | 'false'  // 发布状态筛选
  sortOrder: 'newest' | 'oldest'     // 时间排序
}

// 本地输入值类型
export interface LocalInputValues {
  [key: number]: {
    name?: string
    description?: string
    avatar?: string
    siteshot?: string
    rss?: string
    nickname?: string
    url?: string
    color?: string
  }
}

// 解析结果类型
export interface ParsedApplyText {
  name?: string
  description?: string
  url?: string
  link_url?: string
  avatar?: string
  siteshot?: string
  rss?: string
  nickname?: string
  color?: string
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
  siteshot: '',
  rss: '',
  nickname: '',
  color: '',
  recommend: false,
  published: false,
  createTime: new Date().toISOString()
}

// 默认表单值
export const DEFAULT_FORM_VALUES: FormValues = {
  name: '',
  description: '',
  url: '',
  type: '',
  color: '',
  avatar: '',
  siteshot: '',
  rss: '',
  nickname: ''
}

// 默认筛选条件
export const DEFAULT_FILTERS: FilterState = {
  type: '',
  searchQuery: '',
  published: '',
  sortOrder: 'newest'
}
