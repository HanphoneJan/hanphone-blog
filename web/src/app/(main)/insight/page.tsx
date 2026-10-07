import { createMetadata } from '@/lib/seo-config'
import { API_CODE } from '@/lib/constants'
import InsightClient from './InsightClient'
import type {
  BenchmarkMeta,
  FeaturedGroup,
  HotFeedItem,
  HotOverview,
  HotSourceStatus,
  ModelLeaderboard,
} from './types'

// 数据每日更新且依赖外部信源：按请求实时渲染，避免构建期/缓存导致的空数据
export const dynamic = 'force-dynamic'

const FEED_CATEGORIES = ['github', 'hf', 'ai-news'] as const
const FEED_LIMIT = 30

const MODALITIES = ['text', 'coding', 'agent', 'embedding', 'image', 'video', 'speech'] as const

// 服务端渲染优先走内网后端（直连 8090，注意无 /api 前缀，nginx 才加 /api）；否则回落到公网
const RAW_INTERNAL = process.env.API_INTERNAL_BASE_URL
const API =
  RAW_INTERNAL && RAW_INTERNAL.trim()
    ? RAW_INTERNAL.trim().replace(/\/api\/?$/, '')
    : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'
const HOT = {
  OVERVIEW: `${API}/hot/overview`,
  FEED: (category: string, limit = 30) =>
    `${API}/hot/feed?limit=${limit}&category=${encodeURIComponent(category)}`,
  SOURCES: `${API}/hot/sources`,
  LEADERBOARDS: (modality: string) =>
    `${API}/hot/leaderboards?modality=${encodeURIComponent(modality)}`,
  BENCHMARKS: `${API}/hot/benchmarks`,
  FEATURED: `${API}/hot/models/featured`,
}

export const metadata = createMetadata(
  '热点聚合',
  '聚合 GitHub 热门、Hugging Face 趋势、AI 要闻与主流模型榜单，一眼看清 AI / 计算机领域动向。',
  {
    path: '/insight/',
    keywords: ['AI 热点', 'GitHub 热门', 'Hugging Face 趋势', 'AI 要闻', '模型榜单', '技术雷达'],
  }
)

async function fetchOverview(): Promise<HotOverview | null> {
  try {
    const res = await fetch(HOT.OVERVIEW, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && data.data) {
      return data.data as HotOverview
    }
    return null
  } catch (error) {
    console.error('Failed to fetch insight overview:', error)
    return null
  }
}

async function fetchFeeds(): Promise<Record<string, HotFeedItem[]>> {
  const entries = await Promise.all(
    FEED_CATEGORIES.map(async (category) => {
      try {
        const res = await fetch(HOT.FEED(category, FEED_LIMIT), {
          next: { revalidate: 300 },
        })
        const data = await res.json()
        const items: HotFeedItem[] =
          data.code === API_CODE.SUCCESS && Array.isArray(data.data) ? data.data : []
        return [category, items] as const
      } catch (error) {
        console.error(`Failed to fetch insight feed (${category}):`, error)
        return [category, [] as HotFeedItem[]] as const
      }
    })
  )
  return Object.fromEntries(entries)
}

async function fetchSources(): Promise<HotSourceStatus[]> {
  try {
    const res = await fetch(HOT.SOURCES, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && Array.isArray(data.data)) {
      return data.data as HotSourceStatus[]
    }
    return []
  } catch (error) {
    console.error('Failed to fetch insight sources:', error)
    return []
  }
}

async function fetchLeaderboards(): Promise<Record<string, ModelLeaderboard>> {
  const entries = await Promise.all(
    MODALITIES.map(async (modality) => {
      try {
        const res = await fetch(HOT.LEADERBOARDS(modality), {
          next: { revalidate: 300 },
        })
        const data = await res.json()
        const board: ModelLeaderboard | null =
          data.code === API_CODE.SUCCESS && data.data ? (data.data as ModelLeaderboard) : null
        return [modality, board] as const
      } catch (error) {
        console.error(`Failed to fetch leaderboard (${modality}):`, error)
        return [modality, null] as const
      }
    })
  )
  return Object.fromEntries(entries.filter(([, board]) => board !== null)) as Record<
    string,
    ModelLeaderboard
  >
}

async function fetchBenchmarks(): Promise<BenchmarkMeta[]> {
  try {
    const res = await fetch(HOT.BENCHMARKS, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && Array.isArray(data.data)) {
      return data.data as BenchmarkMeta[]
    }
    return []
  } catch (error) {
    console.error('Failed to fetch benchmarks:', error)
    return []
  }
}

async function fetchFeatured(): Promise<FeaturedGroup[]> {
  try {
    const res = await fetch(HOT.FEATURED, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && Array.isArray(data.data)) {
      return data.data as FeaturedGroup[]
    }
    return []
  } catch (error) {
    console.error('Failed to fetch featured models:', error)
    return []
  }
}

export default async function InsightPage() {
  const [overview, feeds, sources, leaderboards, benchmarks, featured] = await Promise.all([
    fetchOverview(),
    fetchFeeds(),
    fetchSources(),
    fetchLeaderboards(),
    fetchBenchmarks(),
    fetchFeatured(),
  ])

  return (
    <InsightClient
      initialOverview={overview}
      initialFeeds={feeds}
      initialSources={sources}
      initialLeaderboards={leaderboards}
      initialBenchmarks={benchmarks}
      initialFeatured={featured}
    />
  )
}
