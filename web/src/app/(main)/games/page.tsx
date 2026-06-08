import { ENDPOINTS } from '@/lib/api'
import { API_CODE } from '@/lib/constants'
import GamesClient from './GamesClient'

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

async function fetchGames(): Promise<Project[]> {
  try {
    const res = await fetch(`${ENDPOINTS.PROJECTS}?type=3`, {
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
    console.error('Failed to fetch games:', error)
    return []
  }
}

export default async function GamesPage() {
  const games = await fetchGames()
  return <GamesClient initialProjects={games} />
}
