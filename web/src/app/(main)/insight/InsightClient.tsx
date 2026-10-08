'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  Github,
  Sparkles,
  Newspaper,
  ExternalLink,
  Clock,
  AlertTriangle,
  Layers,
  Trophy,
  ListOrdered,
  Scale,
} from 'lucide-react'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import dynamic from 'next/dynamic'
import apiClient from '@/lib/utils'
import { ENDPOINTS } from '@/lib/api'
import { API_CODE } from '@/lib/constants'
import type {
  BenchmarkMeta,
  HotFeedItem,
  HotOverview,
  HotSourceStatus,
  ModelBenchmarkRow,
  ModelLeaderboard,
  Vendor,
} from './types'

// 对比面板依赖 echarts，按需加载，避免进入首屏包
const ComparePanel = dynamic(() => import('./ComparePanel').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="py-16 text-center text-sm text-[rgb(var(--text-muted))]">对比组件加载中…</div>
  ),
})
const LeaderboardTrend = dynamic(() => import('./LeaderboardTrend').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center text-sm text-[rgb(var(--text-muted))]">
      趋势加载中…
    </div>
  ),
})

interface InsightClientProps {
  initialOverview: HotOverview | null
  initialFeeds: Record<string, HotFeedItem[]>
  initialSources: HotSourceStatus[]
  initialLeaderboards: Record<string, ModelLeaderboard>
  initialBenchmarks: BenchmarkMeta[]
  initialVendors: Vendor[]
}

const CATEGORY_ORDER = ['github', 'hf', 'ai-news']
const MODALITY_ORDER = ['text', 'coding', 'agent', 'embedding', 'image', 'video', 'speech']

const FALLBACK_LABELS: Record<string, string> = {
  github: 'GitHub 热门',
  hf: 'Hugging Face 趋势',
  'ai-news': 'AI 要闻',
}

const MODALITY_LABELS: Record<string, string> = {
  text: '文本',
  coding: '代码',
  agent: '智能体',
  embedding: 'Embedding',
  image: '生图',
  video: '生视频',
  speech: '语音',
}

function categoryIcon(category: string) {
  switch (category) {
    case 'github':
      return <Github className="w-4 h-4" />
    case 'hf':
      return <Sparkles className="w-4 h-4" />
    case 'ai-news':
      return <Newspaper className="w-4 h-4" />
    default:
      return <Layers className="w-4 h-4" />
  }
}

function formatScore(score?: number | null): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`
  return String(Math.round(score))
}

function formatTime(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))} 小时前`
  if (diff < 30 * day) return `${Math.round(diff / day)} 天前`
  return date.toLocaleDateString('zh-CN')
}

function formatBenchmarkValue(value: number | undefined, meta?: BenchmarkMeta): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const unit = meta?.unit
  if (unit === 'elo') return String(Math.round(value))
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'score') return value <= 1 ? value.toFixed(3) : value.toFixed(1)
  return value.toFixed(1)
}

function formatContext(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  if (value >= 1000) return `${Math.round(value / 1000)}k`
  return String(value)
}

function formatPrice(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '免费'
  return value < 0.1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`
}

export default function InsightClient({
  initialOverview,
  initialFeeds,
  initialSources,
  initialLeaderboards,
  initialBenchmarks,
  initialVendors,
}: InsightClientProps) {
  const [view, setView] = useState<'feed' | 'leaderboard' | 'compare'>('feed')
  const [active, setActive] = useState<string>('all')
  const [modality, setModality] = useState<string>('text')
  const [normalized, setNormalized] = useState(true)
  const [boards, setBoards] = useState<Record<string, ModelLeaderboard>>(initialLeaderboards)

  // 关闭「名称归一」时按原始厂商/名称重新拉取榜单（服务端 SSR 的为归一数据，需客户端补拉）
  useEffect(() => {
    if (normalized) {
      setBoards(initialLeaderboards)
      return
    }
    let cancelled = false
    Promise.all(
      MODALITY_ORDER.map(async (m) => {
        try {
          const r = await apiClient.get(`${ENDPOINTS.HOT.LEADERBOARDS(m)}&normalized=false`)
          const data = r.data.code === API_CODE.SUCCESS ? (r.data.data as ModelLeaderboard) : null
          return [m, data ?? initialLeaderboards[m]] as const
        } catch {
          return [m, initialLeaderboards[m]] as const
        }
      })
    ).then((entries) => {
      if (!cancelled) setBoards(Object.fromEntries(entries.filter(([, v]) => v)))
    })
    return () => {
      cancelled = true
    }
  }, [normalized, initialLeaderboards])

  // 分享链接直达对比视图
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'compare' || params.get('models')) {
      setView('compare')
    }
  }, [])

  const labels = useMemo(() => {
    const map: Record<string, string> = { ...FALLBACK_LABELS }
    initialOverview?.categories?.forEach((c) => {
      map[c.key] = c.label
    })
    return map
  }, [initialOverview])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    CATEGORY_ORDER.forEach((c) => {
      map[c] = initialFeeds[c]?.length ?? 0
    })
    return map
  }, [initialFeeds])

  const totalItems = useMemo(
    () => CATEGORY_ORDER.reduce((sum, c) => sum + (initialFeeds[c]?.length ?? 0), 0),
    [initialFeeds]
  )

  const availableModalities = useMemo(
    () => MODALITY_ORDER.filter((m) => boards[m]?.rows?.length),
    [boards]
  )

  const healthy = initialOverview?.sourceHealthy ?? 0
  const sourceTotal = initialOverview?.sourceTotal ?? 0
  const hasFailure = sourceTotal > 0 && healthy < sourceTotal

  const visibleCategories = active === 'all' ? CATEGORY_ORDER : [active]
  const board = boards[modality]

  const renderCard = (item: HotFeedItem) => {
    const title = item.titleZh || item.title
    const score = formatScore(item.score)
    const time = formatTime(item.publishedAt || item.lastSeenAt)
    return (
      <motion.a
        key={item.itemKey}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group flex flex-col gap-2 p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-[rgb(var(--primary)/0.5)] hover:shadow-lg transition-all"
      >
        <div className="flex items-start gap-2">
          {item.rank ? (
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
              {item.rank}
            </span>
          ) : null}
          <h3 className="flex-1 text-sm font-semibold leading-snug text-[rgb(var(--text))] group-hover:text-[rgb(var(--primary))] line-clamp-2">
            {title}
          </h3>
          <ExternalLink className="shrink-0 w-3.5 h-3.5 mt-0.5 text-[rgb(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {item.summaryZh ? (
          <p className="text-xs text-[rgb(var(--text-muted))] line-clamp-2">{item.summaryZh}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[rgb(var(--text-muted))]">
          {item.author ? <span className="truncate max-w-[10rem]">{item.author}</span> : null}
          {item.tags ? (
            <span className="px-1.5 py-0.5 rounded bg-[rgb(var(--hover))] text-[rgb(var(--primary))]">
              {item.tags}
            </span>
          ) : null}
          {score ? (
            <span className="inline-flex items-center gap-0.5 text-[rgb(var(--primary))]">
              <Flame className="w-3 h-3" />
              {score}
            </span>
          ) : null}
          {time ? (
            <span className="inline-flex items-center gap-0.5 ml-auto">
              <Clock className="w-3 h-3" />
              {time}
            </span>
          ) : null}
        </div>
      </motion.a>
    )
  }

  const renderFeed = () =>
    totalItems === 0 ? (
      <div className="py-20 text-center text-[rgb(var(--text-muted))]">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>暂时没有采集到数据。可在后台「洞察数据源」手动触发一次采集。</p>
      </div>
    ) : (
      <div className="space-y-8">
        {visibleCategories.map((c) => {
          const items = initialFeeds[c] ?? []
          if (items.length === 0) return null
          return (
            <section key={c}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[rgb(var(--text))]">
                <span className="text-[rgb(var(--primary))]">{categoryIcon(c)}</span>
                {labels[c] || c}
                <span className="text-sm font-normal text-[rgb(var(--text-muted))]">
                  ({items.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map(renderCard)}
              </div>
            </section>
          )
        })}
      </div>
    )

  const renderLeaderboard = () => {
    if (availableModalities.length === 0) {
      return (
        <div className="py-20 text-center text-[rgb(var(--text-muted))]">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-60" />
          <p>暂无榜单数据。可在后台「洞察数据源」手动触发模型榜单采集。</p>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {availableModalities.map((m) => (
            <button
              key={m}
              onClick={() => setModality(m)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                modality === m
                  ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                  : 'bg-[rgb(var(--card))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              {MODALITY_LABELS[m] || m}
              <span className="opacity-70 ml-1">({boards[m]?.rows.length ?? 0})</span>
            </button>
          ))}
        </div>

        {board ? (
          <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-[rgb(var(--text-muted))] border-b border-[rgb(var(--border))]">
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">模型</th>
                  <th className="px-3 py-3 font-medium">厂商</th>
                  {board.benchmarks.map((b) => (
                    <th key={b.key} className="px-3 py-3 font-medium" title={`来源：${b.sourceKey ?? ''}`}>
                      {b.name}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">输入/输出价</th>
                  <th className="px-3 py-3 font-medium">上下文</th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((row: ModelBenchmarkRow, idx) => (
                  <tr
                    key={row.modelKey}
                    className="border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--hover))]"
                  >
                    <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">
                      <div className="flex items-center gap-1">
                        <span>{row.rank ?? idx + 1}</span>
                        {row.rankChange != null && row.rankChange !== 0 ? (
                          <span
                            className={`text-[11px] ${
                              row.rankChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                            }`}
                            title={`较上次快照${row.rankChange > 0 ? '上升' : '下降'} ${Math.abs(
                              row.rankChange
                            )} 名`}
                          >
                            {row.rankChange > 0 ? `↑${row.rankChange}` : `↓${Math.abs(row.rankChange)}`}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[rgb(var(--text))]">{row.displayName}</span>
                        {row.openWeights ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
                            开源
                          </span>
                        ) : null}
                        {row.link ? (
                          <a
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))]"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">{row.vendor || '—'}</td>
                    {board.benchmarks.map((b) => (
                      <td key={b.key} className="px-3 py-2.5 text-[rgb(var(--text))]">
                        {formatBenchmarkValue(row.scores[b.key], b)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">
                      {row.inputPrice == null && row.outputPrice == null
                        ? '—'
                        : `${formatPrice(row.inputPrice)} / ${formatPrice(row.outputPrice)}`}
                    </td>
                    <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">
                      {formatContext(row.contextWindow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
          <div className="mb-1 text-sm font-medium text-[rgb(var(--text))]">
            近 30 天分数趋势（主榜前 5）
          </div>
          <LeaderboardTrend modality={modality} />
        </div>

        <p className="text-xs text-[rgb(var(--text-muted))]">
          榜单口径不同（Elo / 百分比 / 归一化指数）不可直接横向比较，同名榜单内排名才有意义。
          共 {initialBenchmarks.length} 个榜单口径。
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen z-1 relative bg-[rgb(var(--bg)/0.8)]">
      <BgOverlay />
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-6">
        {/* 头部 */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-[rgb(var(--primary))]" />
            <h1 className="text-2xl font-bold text-[rgb(var(--text))]">洞察 · 技术热点聚合</h1>
          </div>
          <p className="mt-1.5 text-sm text-[rgb(var(--text-muted))]">
            GitHub 热门 · Hugging Face 趋势 · 模型榜单 · 综合对比，每天自动更新
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
            <span>
              最后更新：
              {initialOverview?.updatedAt ? formatTime(initialOverview.updatedAt) : '暂无数据'}
            </span>
            <span>收录 {initialOverview?.itemTotal ?? totalItems} 条</span>
            <span>
              信源 {healthy}/{sourceTotal} 正常
            </span>
            {hasFailure ? (
              <span className="inline-flex items-center gap-1 text-[rgb(var(--danger))]">
                <AlertTriangle className="w-3 h-3" />
                部分信源暂不可用，展示上次成功数据
              </span>
            ) : null}
          </div>

          {/* 视图切换 */}
          <div className="mt-4 inline-flex rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-0.5">
            <button
              onClick={() => setView('feed')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'feed'
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              热点
            </button>
            <button
              onClick={() => setView('leaderboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'leaderboard'
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              榜单
            </button>
            <button
              onClick={() => setView('compare')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'compare'
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              <Scale className="w-4 h-4" />
              对比
            </button>
          </div>
          <button
            onClick={() => setNormalized((v) => !v)}
            title="开启后厂商名与模型名后缀会归一显示；关闭则显示信源原始名称"
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              normalized
                ? 'bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] border-[rgb(var(--primary)/0.4)]'
                : 'bg-[rgb(var(--card))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            名称归一：{normalized ? '开' : '关'}
          </button>
        </motion.header>

        {view === 'feed' ? (
          <>
            {/* 分类切换 */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActive('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  active === 'all'
                    ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                    : 'bg-[rgb(var(--card))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
                }`}
              >
                <Layers className="w-4 h-4" />
                全部
              </button>
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    active === c
                      ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                      : 'bg-[rgb(var(--card))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
                  }`}
                >
                  {categoryIcon(c)}
                  {labels[c] || c}
                  <span className="opacity-70">({counts[c] ?? 0})</span>
                </button>
              ))}
            </div>
            {renderFeed()}
          </>
        ) : view === 'leaderboard' ? (
          renderLeaderboard()
        ) : (
          <ComparePanel leaderboards={initialLeaderboards} vendors={initialVendors} normalized={normalized} />
        )}

        {/* 信源说明 */}
        {initialSources.length > 0 ? (
          <footer className="mt-10 pt-4 border-t border-[rgb(var(--border))]">
            <div className="mb-2 text-xs font-medium text-[rgb(var(--text-muted))]">数据来源</div>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {initialSources.map((s) => (
                <a
                  key={s.sourceKey}
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-xs text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--primary)/0.4)] hover:text-[rgb(var(--primary))]"
                >
                  {s.displayName || s.sourceKey}
                </a>
              ))}
            </div>
          </footer>
        ) : null}
      </main>
    </div>
  )
}
