// 文件类型
export type FileType = 'IMAGE' | 'VIDEO' | 'TEXT' | 'OTHER'

// 文件信息接口
export interface EssayFile {
  id: number
  url: string
  urlType: FileType
  urlDesc: string | null
  isValid: boolean
  createTime: string
  name?: string
  /** 原图宽高（px），用于占位避免布局抖动；老数据为 null */
  width?: number | null
  height?: number | null
  /** 列表页/九宫格用的小图 URL；老数据与外链附件为 null，回退到 url */
  thumbPath?: string | null
}

// 本地文件信息接口
export interface FileInfo {
  file: File
  previewUrl: string
  type: FileType
}

// 随笔数据类型
export interface Essay {
  id: number | null
  user_id: number | null
  title: string
  content: string
  createTime: string
  vis?: boolean
  essayFileUrls?: EssayFile[]
  color?: string | null
  image?: string | null
  praise?: number | null
  recommend?: boolean
  published?: boolean
}

// 表单错误类型
export interface FormErrors {
  [key: string]: string
}

// 文件统计类型
export interface FileCounts {
  images: number
  videos: number
  texts: number
}

// 待删除文件信息
export interface FileToDelete {
  index: number
  isLocal: boolean
  fileName: string
  id?: number
}

// 文件上传结果
export interface UploadResult {
  succeeded: EssayFile[]
  failed: string[]
}

// 文件上传进度
export interface UploadProgress {
  current: number
  total: number
  fileName: string
}
