import { ENDPOINTS } from '@/lib/api'
import ProjectClient from './ProjectClient'

import { API_CODE } from '@/lib/constants'
interface Project {
  id: number
  title: string
  content: string
  pic_url: string
  url: string
  techs: string
  type: number
  recommend: boolean
  published: boolean
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

    if (data.code === API_CODE.SUCCESS && data.data) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return []
  }
}

// 服务端组件
export default async function ProjectsPage() {
  const projects = await fetchProjects()

  return <ProjectClient initialProjects={projects} />
}
