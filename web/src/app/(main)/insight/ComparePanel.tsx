'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { toPng } from 'html-to-image'
import {
  Plus,
  X,
  Search,
  Loader2,
  TrendingUp,
  Share2,
  Download,
  Check,
  Layers,
} from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE } from '@/lib/constants'
import { alertError, alertSuccess } from '@/lib/Alert'
import type { BenchmarkMeta, ModelBenchmarkRow, ModelCompare, ModelLeaderboard, Vendor } from './types'

interface ComparePanelProps {
  leaderboards: Record<string, ModelLeaderboard>
  vendors: Vendor[]
  normalized: boolean
}

interface SelectedModel {
  modelKey: string
  displayName: string
  vendor?: string | null
}

const MAX_MODELS = 6
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
const MAX_RADAR_DIMS = 6
const MODALITY_ORDER = ['text', 'coding', 'agent', 'embedding', 'image', 'video', 'speech']
const MODALITY_LABELS: Record<string, string> = {
  text: '文本',
  coding: '代码',
  agent: '智能体',
  embedding: 'Embedding',
  image: '生图',
  video: '生视频',
  speech: '语音',
}
// 对比页默认预置的六家代表厂商（各取当前最强模型）
const SEED_VENDORS = ['DeepSeek', 'Z.ai', 'Kimi', 'Anthropic', 'OpenAI', 'Google']
const SORTS: Array<[string, string]> = [
  ['newest', '最新'],
  ['name', '名称'],
  ['price', '价格'],
  ['context', '上下文'],
]

function formatBenchmarkValue(value: number | undefined | null, meta?: BenchmarkMeta): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const unit = meta?.unit
  if (unit === 'elo') return String(Math.round(value))
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'score') return value <= 1 ? value.toFixed(3) : value.toFixed(1)
  return value.toFixed(1)
}

function formatPrice(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '免费'
  return value < 0.1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`
}

function formatContext(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
}

export default function ComparePanel({ leaderboards, vendors, normalized }: ComparePanelProps) {
  const [selected, setSelected] = useState<SelectedModel[]>([])
  const [compare, setCompare] = useState<ModelCompare | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // 选择器
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'leaderboard' | 'vendor' | 'search'>('leaderboard')
  const [pickerModality, setPickerModality] = useState('text')
  const [activeVendor, setActiveVendor] = useState<string | null>(null)
  const [vendorFilter, setVendorFilter] = useState('')
  const [vendorModels, setVendorModels] = useState<ModelBenchmarkRow[]>([])
  const [vendorLoading, setVendorLoading] = useState(false)
  const [sort, setSort] = useState('newest')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModelBenchmarkRow[]>([])
  const [searching, setSearching] = useState(false)
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors)

  const radarRef = useRef<HTMLDivElement>(null)
  const scatterRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const radarChart = useRef<echarts.ECharts | null>(null)
  const scatterChart = useRef<echarts.ECharts | null>(null)
  const seeded = useRef(false)

  const selectedKeys = useMemo(() => selected.map((s) => s.modelKey), [selected])

  // 榜单模型（自动选前 2 名用）
  const catalog = useMemo(() => {
    const map = new Map<string, ModelBenchmarkRow>()
    MODALITY_ORDER.forEach((m) => {
      leaderboards[m]?.rows?.forEach((r) => {
        if (!map.has(r.modelKey)) map.set(r.modelKey, r)
      })
    })
    return [...map.values()]
  }, [leaderboards])

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const filteredVendors = useMemo(() => {
    const f = vendorFilter.trim().toLowerCase()
    return f ? vendorList.filter((v) => v.label.toLowerCase().includes(f)) : vendorList
  }, [vendorList, vendorFilter])

  // 归一开关：关闭时按原始厂商重新拉取公司列表（SSR 的 vendors 为归一数据）
  useEffect(() => {
    if (normalized) {
      setVendorList(vendors)
      return
    }
    let cancelled = false
    apiClient
      .get(`${ENDPOINTS.HOT.VENDORS}?normalized=false`)
      .then((r) => {
        if (!cancelled && r.data.code === API_CODE.SUCCESS) setVendorList(r.data.data || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [normalized, vendors])

  // 从分享链接还原选择
  useEffect(() => {
    if (typeof window === 'undefined') return
    const models = new URLSearchParams(window.location.search).get('models')
    if (models) {
      const keys = models
        .split(',')
        .map((k) => decodeURIComponent(k))
        .filter(Boolean)
      if (keys.length > 0) {
        setSelected(keys.map((k) => ({ modelKey: k, displayName: k })))
        seeded.current = true
      }
    }
  }, [])

  // 未从链接还原时，默认选六家代表厂商各自最强（文本榜 aa_intelligence 排序）
  useEffect(() => {
    if (seeded.current || catalog.length === 0) return
    const rows = leaderboards.text?.rows ?? catalog
    if (rows.length === 0) return
    const picked = SEED_VENDORS.map((v) => rows.find((r) => r.vendor === v))
      .filter((r): r is ModelBenchmarkRow => Boolean(r))
      .map((r) => ({ modelKey: r.modelKey, displayName: r.displayName, vendor: r.vendor }))
    if (picked.length === 0) return
    seeded.current = true
    setSelected(picked)
  }, [catalog, leaderboards])

  // 对比数据回来后补全展示名
  useEffect(() => {
    if (!compare) return
    setSelected((prev) => {
      let changed = false
      const next = prev.map((s) => {
        const m = compare.models.find((x) => x.modelKey === s.modelKey)
        if (m && (s.displayName !== m.displayName || s.vendor !== m.vendor)) {
          changed = true
          return { ...s, displayName: m.displayName, vendor: m.vendor }
        }
        return s
      })
      return changed ? next : prev
    })
  }, [compare])

  // 同步选择到地址栏
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (selectedKeys.length > 0) {
      url.searchParams.set('view', 'compare')
      url.searchParams.set('models', selectedKeys.map(encodeURIComponent).join(','))
    } else {
      url.searchParams.delete('models')
    }
    window.history.replaceState({}, '', url)
  }, [selectedKeys])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alertSuccess('分享链接已复制')
    } catch {
      alertError('复制失败，请手动复制地址栏链接')
    }
  }

  const exportImage = async () => {
    if (!resultRef.current) return
    setExporting(true)
    try {
      const card = getComputedStyle(document.documentElement).getPropertyValue('--card').trim()
      const backgroundColor = card ? `rgb(${card})` : undefined
      const dataUrl = await toPng(resultRef.current, { backgroundColor, pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `model-compare-${Date.now()}.png`
      a.click()
    } catch (err) {
      console.error('导出图片失败:', err)
      alertError('导出图片失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  // 拉取对比数据
  useEffect(() => {
    if (selectedKeys.length === 0) {
      setCompare(null)
      return
    }
    let cancelled = false
    setLoading(true)
    apiClient
      .get(ENDPOINTS.HOT.COMPARE(selectedKeys) + (normalized ? '' : '&normalized=false'))
      .then((res) => {
        if (!cancelled && res.data.code === API_CODE.SUCCESS) {
          setCompare(res.data.data as ModelCompare)
        }
      })
      .catch((err) => console.error('对比数据获取失败:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedKeys, normalized])

  // 进入「按公司」时默认选第一个（后端已把重点厂商排在前）
  useEffect(() => {
    if (pickerTab === 'vendor' && !activeVendor && vendorList.length > 0) {
      setActiveVendor(vendorList[0].key)
    }
  }, [pickerTab, activeVendor, vendorList])

  // 拉取所选公司的模型（默认最新在前，可切换排序）
  useEffect(() => {
    if (pickerTab !== 'vendor' || !activeVendor) return
    let cancelled = false
    setVendorLoading(true)
    apiClient
      .get(ENDPOINTS.HOT.MODELS({ vendor: activeVendor, sort, limit: 100, normalized }))
      .then((res) => {
        if (!cancelled && res.data.code === API_CODE.SUCCESS) {
          setVendorModels(res.data.data || [])
        }
      })
      .catch((err) => console.error('获取公司模型失败:', err))
      .finally(() => {
        if (!cancelled) setVendorLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pickerTab, activeVendor, sort, normalized])

  // 搜索模型（按名称或厂商），默认最新在前
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiClient.get(ENDPOINTS.HOT.MODELS({ q: query.trim(), sort, limit: 30, normalized }))
        if (res.data.code === API_CODE.SUCCESS) {
          setResults(res.data.data || [])
        }
      } catch (err) {
        console.error('搜索模型失败:', err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, sort, normalized])

  const toggleModel = useCallback((model: SelectedModel) => {
    setSelected((prev) => {
      if (prev.some((m) => m.modelKey === model.modelKey)) {
        return prev.filter((m) => m.modelKey !== model.modelKey)
      }
      if (prev.length >= MAX_MODELS) return prev
      return [...prev, model]
    })
  }, [])

  const removeModel = (key: string) => setSelected((prev) => prev.filter((m) => m.modelKey !== key))

  const modelColor = useCallback(
    (key: string) => {
      const idx = selectedKeys.indexOf(key)
      return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length]
    },
    [selectedKeys]
  )

  // 雷达图（归一化到 0-100）
  useEffect(() => {
    if (!compare || !radarRef.current) return
    const models = compare.models
    const dims = compare.benchmarks
      .filter((b) => models.filter((m) => m.scores[b.key] !== undefined).length >= 2)
      .slice(0, MAX_RADAR_DIMS)
    if (dims.length < 3) {
      radarChart.current?.dispose()
      radarChart.current = null
      if (radarRef.current) radarRef.current.innerHTML = ''
      return
    }
    const ranges = dims.map((b) => {
      const values = models.map((m) => m.scores[b.key]).filter((v): v is number => v !== undefined)
      return { min: Math.min(...values), max: Math.max(...values) }
    })

    const instance = radarChart.current ?? echarts.init(radarRef.current)
    radarChart.current = instance
    instance.setOption({
      backgroundColor: 'transparent',
      tooltip: {},
      legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
      radar: {
        indicator: dims.map((b) => ({ name: b.name, max: 100 })),
        radius: '62%',
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
        splitArea: { areaStyle: { color: ['transparent'] } },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
        axisName: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          type: 'radar',
          areaStyle: { opacity: 0.08 },
          data: models.map((m) => ({
            name: m.displayName,
            value: dims.map((b, i) => {
              const v = m.scores[b.key]
              if (v === undefined) return 0
              const { min, max } = ranges[i]
              return max === min ? 100 : Math.round(((v - min) / (max - min)) * 100)
            }),
            lineStyle: { color: modelColor(m.modelKey) },
            itemStyle: { color: modelColor(m.modelKey) },
          })),
        },
      ],
    })
  }, [compare, selectedKeys, modelColor])

  // 价格-能力散点
  useEffect(() => {
    if (!compare || !scatterRef.current) return
    const primary = compare.benchmarks[0]
    if (!primary) return
    const points = compare.models
      .map((m) => {
        const price =
          m.inputPrice != null && m.outputPrice != null
            ? (m.inputPrice + m.outputPrice) / 2
            : (m.inputPrice ?? m.outputPrice)
        const score = m.scores[primary.key]
        if (price == null || score === undefined) return null
        return { name: m.displayName, value: [price, score], key: m.modelKey }
      })
      .filter((p): p is { name: string; value: number[]; key: string } => p !== null)
    if (points.length === 0) {
      scatterChart.current?.dispose()
      scatterChart.current = null
      if (scatterRef.current) scatterRef.current.innerHTML = ''
      return
    }
    const instance = scatterChart.current ?? echarts.init(scatterRef.current)
    scatterChart.current = instance
    instance.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { data: { name: string; value: number[] } }
          return `${p.data.name}<br/>价格: $${Number(p.data.value[0]).toFixed(3)}/1M<br/>${primary.name}: ${formatBenchmarkValue(
            p.data.value[1],
            primary
          )}`
        },
      },
      grid: { left: 60, right: 30, top: 30, bottom: 40 },
      xAxis: {
        type: 'value',
        name: '价格 $/1M',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      yAxis: {
        type: 'value',
        name: primary.name,
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 14,
          data: points.map((p) => ({
            name: p.name,
            value: [Number(Number(p.value[0]).toFixed(3)), p.value[1]],
            itemStyle: { color: modelColor(p.key) },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params: unknown) => (params as { data: { name: string } }).data.name,
            color: '#94a3b8',
            fontSize: 10,
          },
        },
      ],
    })
  }, [compare, selectedKeys, modelColor])

  useEffect(() => {
    const onResize = () => {
      radarChart.current?.resize()
      scatterChart.current?.resize()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(
    () => () => {
      radarChart.current?.dispose()
      scatterChart.current?.dispose()
    },
    []
  )

  const isBest = (bench: BenchmarkMeta, value: number, allValues: (number | undefined)[]) => {
    const numeric = allValues.filter((v): v is number => v !== undefined)
    if (numeric.length < 2) return false
    const target = bench.higherIsBetter ? Math.max(...numeric) : Math.min(...numeric)
    return value === target
  }

  const hasResult = compare !== null && compare.models.length > 0
  const leaderboardRows = leaderboards[pickerModality]?.rows ?? []

  return (
    <div className="space-y-3">
      {/* 紧凑工具栏：添加模型 + 已选 chips + 分享/导出（不再占大块空间） */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[rgb(var(--primary))] text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          添加模型
        </button>
        {selected.map((m) => (
          <span
            key={m.modelKey}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm border"
            style={{ borderColor: modelColor(m.modelKey), color: modelColor(m.modelKey) }}
          >
            {m.displayName}
            <button onClick={() => removeModel(m.modelKey)} aria-label="移除">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--text-muted))]" /> : null}
        <span className="flex-1" />
        {hasResult ? (
          <>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              <Share2 className="w-4 h-4" />
              分享链接
            </button>
            <button
              onClick={exportImage}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? '导出中…' : '导出图片'}
            </button>
          </>
        ) : null}
      </div>

      {/* 结果区：页面主体 */}
      {hasResult ? (
        <div ref={resultRef} className="space-y-4 rounded-xl bg-[rgb(var(--bg))] p-3">
          {/* 图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compare.benchmarks.filter(
              (b) => compare.models.filter((m) => m.scores[b.key] !== undefined).length >= 2
            ).length >= 3 ? (
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--text))]">
                  <TrendingUp className="w-4 h-4 text-[rgb(var(--primary))]" />
                  能力雷达（榜内归一化 0–100）
                </div>
                <div ref={radarRef} className="w-full h-80" />
              </div>
            ) : null}
            {compare.benchmarks[0] &&
            compare.models.some((m) => m.inputPrice != null || m.outputPrice != null) ? (
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--text))]">
                  <TrendingUp className="w-4 h-4 text-[rgb(var(--primary))]" />
                  价格 – 能力（{compare.benchmarks[0].name}）
                </div>
                <div ref={scatterRef} className="w-full h-80" />
              </div>
            ) : null}
          </div>

          {/* 明细对比表 */}
          <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-[rgb(var(--border))]">
                  <th className="px-3 py-3 text-left font-medium text-[rgb(var(--text-muted))]">指标</th>
                  {compare.models.map((m) => (
                    <th key={m.modelKey} className="px-3 py-3 text-left font-medium">
                      <span style={{ color: modelColor(m.modelKey) }}>{m.displayName}</span>
                      <div className="text-[11px] font-normal text-[rgb(var(--text-muted))]">{m.vendor || ''}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.benchmarks
                  .filter((b) => compare.models.some((m) => m.scores[b.key] !== undefined))
                  .map((b) => {
                    const allValues = compare.models.map((m) => m.scores[b.key])
                    return (
                      <tr key={b.key} className="border-b border-[rgb(var(--border))] last:border-0">
                        <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]" title={`来源：${b.sourceKey ?? ''}`}>
                          {b.name}
                          <span className="ml-1 text-[10px] opacity-60">{b.unit}</span>
                        </td>
                        {compare.models.map((m) => {
                          const v = m.scores[b.key]
                          const best = v !== undefined && isBest(b, v, allValues)
                          return (
                            <td
                              key={m.modelKey}
                              className={`px-3 py-2.5 ${
                                best ? 'font-semibold text-[rgb(var(--primary))]' : 'text-[rgb(var(--text))]'
                              }`}
                            >
                              {formatBenchmarkValue(v, b)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                <tr className="border-b border-[rgb(var(--border))]">
                  <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">输入价 / 输出价</td>
                  {compare.models.map((m) => (
                    <td key={m.modelKey} className="px-3 py-2.5 text-[rgb(var(--text))]">
                      {m.inputPrice == null && m.outputPrice == null
                        ? '—'
                        : `${formatPrice(m.inputPrice)} / ${formatPrice(m.outputPrice)}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[rgb(var(--border))]">
                  <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">上下文窗口</td>
                  {compare.models.map((m) => (
                    <td key={m.modelKey} className="px-3 py-2.5 text-[rgb(var(--text))]">
                      {formatContext(m.contextWindow)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[rgb(var(--border))]">
                  <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">权重开放</td>
                  {compare.models.map((m) => (
                    <td key={m.modelKey} className="px-3 py-2.5 text-[rgb(var(--text))]">
                      {m.openWeights == null ? '—' : m.openWeights ? '开源' : '闭源'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2.5 text-[rgb(var(--text-muted))]">发布时间</td>
                  {compare.models.map((m) => (
                    <td key={m.modelKey} className="px-3 py-2.5 text-[rgb(var(--text))]">
                      {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString('zh-CN') : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            提示：不同榜单口径（Elo / 百分比 / 归一化指数）不可直接比较；雷达图为所选模型在各自榜单内的相对归一化，仅供横向感受。
          </p>
        </div>
      ) : (
        <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[rgb(var(--border))] text-center">
          <Layers className="w-10 h-10 text-[rgb(var(--text-muted))] opacity-60" />
          <p className="text-sm text-[rgb(var(--text-muted))]">选择 2–{MAX_MODELS} 个模型开始对比</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">可按榜单、按公司或搜索添加</p>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[rgb(var(--primary))] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            添加模型
          </button>
        </div>
      )}

      {/* 模型选择器（弹层）：按榜单 / 按公司 / 搜索 */}
      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[rgb(var(--card))] rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgb(var(--border))]">
              <span className="text-sm font-semibold text-[rgb(var(--text))]">添加模型</span>
              <span className="text-xs text-[rgb(var(--text-muted))]">
                已选 {selected.length}/{MAX_MODELS}
              </span>
              <span className="flex-1" />
              <button onClick={() => setPickerOpen(false)} aria-label="关闭">
                <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
              </button>
            </div>

            <div className="flex gap-1 px-3 pt-2">
              {(
                [
                  ['leaderboard', '按榜单'],
                  ['vendor', '按公司'],
                  ['search', '搜索'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPickerTab(key)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    pickerTab === key
                      ? 'bg-[rgb(var(--primary))] text-white'
                      : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {pickerTab === 'leaderboard' ? (
                <>
                  <div className="flex flex-wrap gap-2 px-3 py-2 sticky top-0 bg-[rgb(var(--card))]">
                    {MODALITY_ORDER.map((m) => (
                      <button
                        key={m}
                        onClick={() => setPickerModality(m)}
                        className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                          pickerModality === m
                            ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                            : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
                        }`}
                      >
                        {MODALITY_LABELS[m] || m}
                      </button>
                    ))}
                  </div>
                  {leaderboardRows.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[rgb(var(--text-muted))]">暂无该榜单模型</p>
                  ) : (
                    leaderboardRows.map((r) => (
                      <PickerRow
                        key={r.modelKey}
                        row={r}
                        selected={selectedSet.has(r.modelKey)}
                        full={selected.length >= MAX_MODELS}
                        onToggle={() => toggleModel({ modelKey: r.modelKey, displayName: r.displayName, vendor: r.vendor })}
                      />
                    ))
                  )}
                </>
              ) : pickerTab === 'vendor' ? (
                <div className="flex flex-col">
                  {/* 公司筛选 + 排序（单行，避免把模型列表挤下去） */}
                  <div className="sticky top-0 bg-[rgb(var(--card))] px-3 py-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
                      <input
                        value={vendorFilter}
                        onChange={(e) => setVendorFilter(e.target.value)}
                        placeholder="筛选公司…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
                      />
                    </div>
                    <SortBar sort={sort} onChange={setSort} />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {filteredVendors.length === 0 ? (
                        <span className="text-xs text-[rgb(var(--text-muted))]">未找到相关公司</span>
                      ) : (
                        filteredVendors.map((v) => (
                          <button
                            key={v.key}
                            onClick={() => setActiveVendor(v.key)}
                            className={`shrink-0 px-3 py-1 rounded-lg text-sm border transition-colors ${
                              activeVendor === v.key
                                ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                                : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
                            }`}
                          >
                            {v.focused ? '★ ' : ''}
                            {v.label}
                            <span className="opacity-60 ml-1">({v.modelCount})</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  {vendorLoading ? (
                    <p className="py-10 text-center text-sm text-[rgb(var(--text-muted))]">加载中…</p>
                  ) : vendorModels.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[rgb(var(--text-muted))]">该公司暂无模型</p>
                  ) : (
                    vendorModels.map((r) => (
                      <PickerRow
                        key={r.modelKey}
                        row={r}
                        selected={selectedSet.has(r.modelKey)}
                        full={selected.length >= MAX_MODELS}
                        onToggle={() => toggleModel({ modelKey: r.modelKey, displayName: r.displayName, vendor: r.vendor })}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="sticky top-0 bg-[rgb(var(--card))] px-3 py-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜索模型名称或厂商…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
                      />
                      {searching ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[rgb(var(--text-muted))]" />
                      ) : null}
                    </div>
                    <SortBar sort={sort} onChange={setSort} />
                  </div>
                  {results.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[rgb(var(--text-muted))]">
                      {query.trim() ? '未找到相关模型' : '输入名称或厂商搜索任意模型'}
                    </p>
                  ) : (
                    results.map((r) => (
                      <PickerRow
                        key={r.modelKey}
                        row={r}
                        selected={selectedSet.has(r.modelKey)}
                        full={selected.length >= MAX_MODELS}
                        onToggle={() => toggleModel({ modelKey: r.modelKey, displayName: r.displayName, vendor: r.vendor })}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SortBar({ sort, onChange }: { sort: string; onChange: (s: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
      <span>排序</span>
      <div className="flex gap-1 overflow-x-auto">
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`shrink-0 px-2.5 py-0.5 rounded-md border transition-colors ${
              sort === key
                ? 'bg-[rgb(var(--primary))] text-white border-transparent'
                : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PickerRow({
  row,
  selected,
  full,
  onToggle,
}: {
  row: ModelBenchmarkRow
  selected: boolean
  full: boolean
  onToggle: () => void
}) {
  const disabled = !selected && full
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] disabled:opacity-40"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-[rgb(var(--text))]">{row.displayName}</span>
        {row.vendor ? <span className="block text-xs text-[rgb(var(--text-muted))]">{row.vendor}</span> : null}
      </span>
      {selected ? (
        <Check className="w-4 h-4 shrink-0 text-[rgb(var(--primary))]" />
      ) : (
        <Plus className="w-4 h-4 shrink-0 text-[rgb(var(--text-muted))]" />
      )}
    </button>
  )
}
