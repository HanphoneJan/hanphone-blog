import { ENDPOINTS } from '@/lib/api'
import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'
import ProjectClient from './ProjectClient'

interface Project {
  id: number
  title: string
  description: string
  url: string
  cover: string
  type: 'project' | 'tool' | 'game' | 'practice'
  tags: string[]
  order: number
  createTime: string
}

// ISR：每5分钟重新验证
export const revalidate = 300

// 获取项目数据（服务端）
async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(ENDPOINTS.PROJECTS, {
      next: { revalidate: 300 }
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()

    if (data.code === 200 && data.data) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return []
  }
}

// 生成元数据
export async function generateMetadata() {
  return {
    title: '项目展示 | ' + SITE_CONFIG.name,
    description: '探索个人项目作品集，包括完整项目、实用工具、小游戏和编程练习。',
    keywords: '项目,作品集,工具,小游戏,编程练习,React,Next.js,前端开发',
    openGraph: {
      title: '项目展示 | ' + SITE_CONFIG.name,
      description: '探索个人项目作品集，包括完整项目、实用工具、小游戏和编程练习。',
      url: `${SITE_URL}/projects`,
      type: 'website',
    },
  }
}

// 服务端组件
export default async function ProjectsPage() {
  const projects = await fetchProjects()

  return <ProjectClient initialProjects={projects} />
}
