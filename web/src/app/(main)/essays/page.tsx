import { ENDPOINTS } from '@/lib/api'
import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'
import EssayClient from './EssayClient'

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

    if (data.code === 200 && data.data) {
      return data.data.content || []
    }
    return []
  } catch (error) {
    console.error('Failed to fetch essays:', error)
    return []
  }
}

// 生成元数据
export async function generateMetadata() {
  return {
    title: '随笔 | ' + SITE_CONFIG.name,
    description: '阅读生活随笔、技术心得和日常分享，记录生活中的点滴感悟。',
    keywords: '随笔,生活,技术心得,日常分享,博客',
    openGraph: {
      title: '随笔 | ' + SITE_CONFIG.name,
      description: '阅读生活随笔、技术心得和日常分享，记录生活中的点滴感悟。',
      url: `${SITE_URL}/essays`,
      type: 'website',
    },
  }
}

// 服务端组件
export default async function EssayPage() {
  const essays = await fetchEssays()

  return <EssayClient initialEssays={essays} />
}
