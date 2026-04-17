import { ProjectFormData, Project, ProjectType } from './types'

// 项目类型选项
export const PROJECT_TYPES: ProjectType[] = [
  { id: 0, name: '未展示' },
  { id: 1, name: '完整项目' },
  { id: 2, name: '工具箱' },
  { id: 3, name: '小游戏' },
  { id: 4, name: '小练习' }
]

// 表单验证函数
export const validateProjectForm = (formData: ProjectFormData, imageUrl: string): string | null => {
  if (!formData.title.trim()) {
    return '请输入项目名称'
  }
  if (!formData.content.trim()) {
    return '请输入项目描述'
  }
  if (!formData.url.trim()) {
    return '请输入项目地址'
  }
  if (!formData.techs.trim()) {
    return '请输入技术栈'
  }
  if (!imageUrl) {
    return '请上传项目图片'
  }
  return null
}

// URL验证
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 日期格式化
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 相对时间格式化
export const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`

  return formatDate(dateString)
}

// 类型中文映射
export const getTypeName = (typeId: number): string => {
  const type = PROJECT_TYPES.find(t => t.id === typeId)
  return type?.name || '未知类型'
}

// 状态中文映射
export const getStatusName = (recommend?: boolean): string => {
  return recommend ? '已推荐' : '未推荐'
}

// 获取类型样式
export const getTypeStyle = (typeId: number): string => {
  const styles: Record<number, string> = {
    0: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    1: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    2: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    3: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    4: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
  }
  return styles[typeId] || styles[0]
}

// 获取状态样式
export const getStatusStyle = (recommend?: boolean): string => {
  return recommend
    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

// 处理API返回的项目数据
export const processProjectData = (data: any[]): Project[] => {
  return data.map((item: any) => ({
    ...item,
    techs: item.techs || '',
    recommend: item.recommend || false,
    inputVisible: false,
    inputValue: '',
    editingTitle: false,
    editingContent: false,
    editingImage: false,
    editingUrl: false,
    tempTitle: item.title,
    tempContent: item.content,
    tempImageUrl: item.pic_url,
    tempUrl: item.url
  }))
}

// 过滤项目列表
export const filterProjects = (
  projects: Project[],
  filters: {
    type: number
    searchQuery: string
    status: 'all' | 'recommended' | 'unrecommended'
  }
): Project[] => {
  let result = [...projects]

  // 按类型筛选
  if (filters.type !== -1) {
    result = result.filter(item => item.type === filters.type)
  }

  // 按标题搜索
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    result = result.filter(item => item.title.toLowerCase().includes(query))
  }

  // 按推荐状态筛选
  if (filters.status === 'recommended') {
    result = result.filter(item => item.recommend)
  } else if (filters.status === 'unrecommended') {
    result = result.filter(item => !item.recommend)
  }

  return result
}

// 排序项目列表
export const sortProjects = (
  projects: Project[],
  sortBy: 'created' | 'name' | 'progress',
  sortOrder: 'asc' | 'desc'
): Project[] => {
  const sorted = [...projects]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'created':
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        break
      case 'name':
        comparison = a.title.localeCompare(b.title)
        break
      case 'progress':
        // 使用类型作为进度排序依据
        comparison = a.type - b.type
        break
      default:
        comparison = 0
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return sorted
}
