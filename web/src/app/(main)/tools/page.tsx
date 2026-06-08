import { ENDPOINTS } from '@/lib/api'
import { API_CODE } from '@/lib/constants'
import ToolsClient from './ToolsClient'

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

export const revalidate = 300

async function fetchTools(): Promise<Project[]> {
  try {
    const res = await fetch(`${ENDPOINTS.PROJECTS}?type=2`, {
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
    console.error('Failed to fetch tools:', error)
    return []
  }
}

export default async function ToolsPage() {
  const tools = await fetchTools()
  return <ToolsClient initialProjects={tools} />
}
