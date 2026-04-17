import { ENDPOINTS } from '@/lib/api'
import PersonalClient from './PersonalClient'

export const dynamic = 'force-dynamic'

// 定义数据类型
interface Item {
  id: number
  category: 'skill' | 'work' | 'hobby' | 'evaluation'
  name: string
  description: string | null
  pic_url: string | null
  url: string | null
  icon_src: string | null
  rank: number | null
}

// 获取个人数据（服务端）
async function fetchPersonalData(): Promise<Item[]> {
  try {
    const res = await fetch(ENDPOINTS.USER.PERSONINFOS, {
      cache: 'no-store'
    })
    const data = await res.json()

    if (data.code === 200 && data.data) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('Failed to fetch personal data:', error)
    return []
  }
}

// 生成静态元数据
export async function generateMetadata() {
  return {
    title: '关于我 | 寒枫的博客',
    description: '了解更多关于寒枫的信息，包括技能、作品、爱好和个人评价。'
  }
}

// 服务端组件
export default async function PersonalPage() {
  const data = await fetchPersonalData()

  return <PersonalClient initialData={data} />
}
