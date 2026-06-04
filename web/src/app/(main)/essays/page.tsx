import { ENDPOINTS } from '@/lib/api'
import EssayClient from './EssayClient'

import { API_CODE } from '@/lib/constants'
interface Essay {
  id: number
  content: string
  createTime: string
  updateTime: string
  userId: number
  username: string
  nickname: string
  avatar: string
  likes: number
  isLiked: boolean
  comments: Comment[]
  files?: EssayFile[]
}

interface Comment {
  id: number
  content: string
  createTime: string
  userId: number
  username: string
  nickname: string
  avatar: string
  replies?: Comment[]
}

interface EssayFile {
  id: number
  filename: string
  fileType: string
  fileSize: number
  url: string
  thumbnailUrl?: string
}

// ISR：每5分钟重新验证
export const revalidate = 300

// 获取随笔数据（服务端）
async function fetchEssays(): Promise<Essay[]> {
  try {
    const res = await fetch(`${ENDPOINTS.ESSAYS}?pagenum=1&pagesize=10`, {
      next: { revalidate: 300 }
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()

    if (data.code === API_CODE.SUCCESS && data.data) {
      return data.data.content || []
    }
    return []
  } catch (error) {
    console.error('Failed to fetch essays:', error)
    return []
  }
}

// 服务端组件
export default async function EssayPage() {
  const essays = await fetchEssays()

  return <EssayClient initialEssays={essays} />
}
