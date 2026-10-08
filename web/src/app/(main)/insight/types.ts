// 洞察（Insight）页面类型定义

export interface HotFeedItem {
  sourceKey: string
  category: string
  itemKey: string
  title: string
  titleZh?: string | null
  summaryZh?: string | null
  url: string
  author?: string | null
  tags?: string | null
  score?: number | null
  rank?: number | null
  publishedAt?: string | null
  firstSeenAt?: string | null
  lastSeenAt?: string | null
}

export interface HotCategory {
  key: string
  label: string
  count: number
}

export interface HotOverview {
  updatedAt?: string | null
  sourceTotal: number
  sourceHealthy: number
  itemTotal: number
  categories: HotCategory[]
  topItems: HotFeedItem[]
}

export interface HotSourceStatus {
  sourceKey: string
  category: string
  displayName: string
  sourceUrl: string
  enabled: boolean
  itemCount: number
  lastStatus: string | null
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
}

export interface BenchmarkMeta {
  key: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  sourceKey: string | null
}

export interface ModelBenchmarkRow {
  modelKey: string
  displayName: string
  vendor?: string | null
  modality?: string | null
  openWeights?: boolean | null
  releaseDate?: string | null
  link?: string | null
  rank?: number | null
  rankChange?: number | null
  scores: Record<string, number>
  inputPrice?: number | null
  outputPrice?: number | null
  contextWindow?: number | null
}

export interface ModelLeaderboard {
  modality: string
  label: string
  benchmarks: BenchmarkMeta[]
  rows: ModelBenchmarkRow[]
}

export interface ModelCompare {
  models: ModelBenchmarkRow[]
  benchmarks: BenchmarkMeta[]
}

export interface Vendor {
  key: string
  label: string
  modelCount: number
  focused: boolean
  priority: number
}

export interface TrendPoint {
  date: string
  score?: number | null
  rank?: number | null
}

export interface TrendSeries {
  key: string
  label: string
  unit?: string | null
  points: TrendPoint[]
}

export interface LeaderboardTrend {
  modality: string
  benchmarkKey?: string | null
  benchmarkName?: string | null
  unit?: string | null
  series: TrendSeries[]
}

export interface ModelTrend {
  modelKey: string
  displayName: string
  series: TrendSeries[]
}
