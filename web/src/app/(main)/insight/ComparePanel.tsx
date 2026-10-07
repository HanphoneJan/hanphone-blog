'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { toPng } from 'html-to-image'
import { Plus, X, Search, Loader2, TrendingUp, Sparkles, Share2, Download } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE } from '@/lib/constants'
import { alertError, alertSuccess } from '@/lib/Alert'
import type { BenchmarkMeta, FeaturedGroup, ModelBenchmarkRow, ModelCompare } from './types'

interface ComparePanelProps {
  featured: FeaturedGroup[]
}

interface SelectedModel {
  modelKey: string
  displayName: string
  vendor?: string | null
}

const MAX_MODELS = 6
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
const MAX_RADAR_DIMS = 6

function formatBenchmarkValue(value: number | undefined | null, meta?: BenchmarkMeta): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const unit = meta?.unit
  if (unit === 'elo') return String(Math.round(value))
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'score') return value <= 1 ? value.toFixed(3) : value.toFixed(1)
  return value.toFixed(2)
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

export default function ComparePanel({ featured }: ComparePanelProps) {
  const [selected, setSelected] = useState<SelectedModel[]>([])
  const [compare, setCompare] = useState<ModelCompare | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModelBenchmarkRow[]>([])
  const [searching, setSearching] = useState(false)
  const [exporting, setExporting] = useState(false)

  const radarRef = useRef<HTMLDivElement>(null)
  const scatterRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const radarChart = useRef<echarts.ECharts | null>(null)
  const scatterChart = useRef<echarts.ECharts | null>(null)

  const selectedKeys = useMemo(() => selected.map((s) => s.modelKey), [selected])

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
      }
    }
  }, [])

  // 对比数据回来后补全模型展示名（避免分享链接只显示 key）
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

  // 同步选择到地址栏，便于复制分享
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
      .get(ENDPOINTS.HOT.COMPARE(selectedKeys))
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
  }, [selectedKeys])

  // 搜索模型
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiClient.get(ENDPOINTS.HOT.MODELS(query.trim(), 8))
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
  }, [query])

  const addModel = (model: SelectedModel) => {
    setSelected((prev) => {
      if (prev.some((m) => m.modelKey === model.modelKey) || prev.length >= MAX_MODELS) {
        return prev
      }
      return [...prev, model]
    })
    setQuery('')
    setResults([])
  }

  const removeModel = (key: string) => {
    setSelected((prev) => prev.filter((m) => m.modelKey !== key))
  }

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
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
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
    return () => {
      /* 保持实例，交给卸载清理 */
    }
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
    return () => {
      /* noop */
    }
  }, [compare, selectedKeys, modelColor])

  // 尺寸自适应
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

  return (
    <div className="space-y-4">
      {/* 精选快捷添加 */}
      {featured.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--text))]">
            <Sparkles className="w-4 h-4 text-[rgb(var(--primary))]" />
            代表模型（点击添加）
          </div>
          {featured.map((group) => (
            <div key={group.key} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-[rgb(var(--text-muted))]">{group.label}</span>
              {group.models.map((m) => {
                const active = selectedKeys.includes(m.modelKey)
                return (
                  <button
                    key={m.modelKey}
                    disabled={active || selected.length >= MAX_MODELS}
                    onClick={() =>
                      addModel({ modelKey: m.modelKey, displayName: m.displayName, vendor: m.vendor })
                    }
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-colors ${
                      active
                        ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] border-[rgb(var(--primary)/0.4)]'
                        : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] disabled:opacity-40'
                    }`}
                    title={m.vendor || ''}
                  >
                    {active ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {m.displayName}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}

      {/* 搜索添加 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索任意模型加入对比…"
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[rgb(var(--text-muted))]" />
        ) : null}
        {results.length > 0 ? (
          <ul className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-lg">
            {results.map((r) => (
              <li key={r.modelKey}>
                <button
                  onClick={() =>
                    addModel({ modelKey: r.modelKey, displayName: r.displayName, vendor: r.vendor })
                  }
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[rgb(var(--hover))] flex items-center justify-between gap-2"
                >
                  <span className="truncate text-[rgb(var(--text))]">{r.displayName}</span>
                  <span className="shrink-0 text-xs text-[rgb(var(--text-muted))]">{r.vendor || ''}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* 已选 */}
      <div className="flex flex-wrap items-center gap-2 min-h-[2rem]">
        {selected.length === 0 ? (
          <span className="text-sm text-[rgb(var(--text-muted))]">
            从上方选择 2–{MAX_MODELS} 个模型开始对比
          </span>
        ) : (
          selected.map((m) => (
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
          ))
        )}
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--text-muted))]" /> : null}
      </div>

      {/* 分享 / 导出 */}
      {compare && compare.models.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
          >
            <Share2 className="w-4 h-4" />
            复制分享链接
          </button>
          <button
            onClick={exportImage}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? '导出中…' : '导出图片'}
          </button>
        </div>
      ) : null}

      {/* 结果 */}
      {compare && compare.models.length > 0 ? (
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
                      <div className="text-[11px] font-normal text-[rgb(var(--text-muted))]">
                        {m.vendor || ''}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.benchmarks.map((b) => {
                  const allValues = compare.models.map((m) => m.scores[b.key])
                  return (
                    <tr
                      key={b.key}
                      className="border-b border-[rgb(var(--border))] last:border-0"
                    >
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
                              best
                                ? 'font-semibold text-[rgb(var(--primary))]'
                                : 'text-[rgb(var(--text))]'
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
      ) : null}
    </div>
  )
}
