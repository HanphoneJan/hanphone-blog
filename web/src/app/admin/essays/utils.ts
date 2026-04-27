import { FileImage, FileVideo, FileText, FileCode } from 'lucide-react'
import type { FileType, EssayFile, FileCounts } from './types'

// 内容最大字数限制
export const MAX_CONTENT_LENGTH = 3000

// 文件最大数量限制
export const MAX_FILE_COUNT = 9

// 格式化日期
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// 判断文件类型
export const getFileType = (file: File): FileType => {
  if (file.type.startsWith('image/')) {
    return 'IMAGE'
  } else if (file.type.startsWith('video/')) {
    return 'VIDEO'
  } else if (
    file.type.includes('pdf') ||
    file.type.includes('word') ||
    file.type.includes('powerpoint') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt')
  ) {
    return 'TEXT'
  }
  return 'OTHER'
}

// 根据urlType获取文件类型图标组件
export const getFileIconByType = (urlType: FileType, fileName: string) => {
  if (urlType === 'IMAGE') {
    return FileImage
  } else if (urlType === 'VIDEO') {
    return FileVideo
  } else {
    if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      return FileCode
    }
    return FileText
  }
}

// 统计各类文件数量
export const countFilesByType = (files: EssayFile[]): FileCounts => {
  return {
    images: files.filter(f => f.urlType === 'IMAGE').length,
    videos: files.filter(f => f.urlType === 'VIDEO').length,
    texts: files.filter(f => f.urlType === 'TEXT' || f.urlType === 'OTHER').length
  }
}

// 表单验证
export interface ValidationResult {
  isValid: boolean
  errors: { [key: string]: string }
}

export const validateEssayForm = (
  title: string,
  content: string,
  uploadedFileCount: number,
  localFileCount: number
): ValidationResult => {
  const errors: { [key: string]: string } = {}

  if (!title.trim()) {
    errors.title = '标题不能为空！'
  } else if (title.length > 100) {
    errors.title = '标题不超过100字！'
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    errors.content = `内容不超过${MAX_CONTENT_LENGTH}字！`
  }

  // 至少需要有内容或文件
  const fileCount = uploadedFileCount + localFileCount

  if (!content.trim() && fileCount === 0) {
    errors.content = '内容和文件不能同时为空！'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// 获取文件名
export const getFileName = (file: EssayFile): string => {
  return file.name || file.url.split('/').pop() || `文件${file.id}`
}
