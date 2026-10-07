'use client'

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE } from '@/lib/constants'
import type { LeaderboardTrend } from './types'

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

interface LeaderboardTrendChartProps {
  modality: string
  days?: number
  top?: number
}

/**
 * 某模态主榜头部模型的分数趋势折线图（echarts）。
 */
export default function LeaderboardTrendChart({
  modality,
  days = 30,
  top = 5,
}: LeaderboardTrendChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<LeaderboardTrend | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    chart.current?.dispose()
    chart.current = null
    setLoading(true)
    apiClient
      .get(ENDPOINTS.HOT.LEADERBOARD_TREND(modality, days, top))
      .then((res) => {
        if (!cancelled && res.data.code === API_CODE.SUCCESS) {
          setData(res.data.data as LeaderboardTrend)
        }
      })
      .catch((err) => console.error('趋势数据获取失败:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [modality, days, top])

  useEffect(() => {
    if (!data || !ref.current) return
    const dates = Array.from(new Set(data.series.flatMap((s) => s.points.map((p) => p.date)))).sort()
    if (dates.length === 0) {
      if (ref.current) ref.current.innerHTML = ''
      return
    }
    const instance = chart.current ?? echarts.init(ref.current)
    chart.current = instance
    instance.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { left: 50, right: 24, top: 20, bottom: 52 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      series: data.series.map((s, i) => ({
        name: s.label,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: 5,
        connectNulls: true,
        data: dates.map((d) => {
          const point = s.points.find((p) => p.date === d)
          return point ? point.score ?? null : null
        }),
        lineStyle: { color: PALETTE[i % PALETTE.length] },
        itemStyle: { color: PALETTE[i % PALETTE.length] },
      })),
    })
  }, [data])

  useEffect(() => {
    const onResize = () => chart.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(
    () => () => {
      chart.current?.dispose()
    },
    []
  )

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-[rgb(var(--text-muted))]">
        趋势加载中…
      </div>
    )
  }
  if (!data || data.series.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-[rgb(var(--text-muted))]">
        暂无历史趋势数据（榜单快照需连续采集后逐步积累）
      </div>
    )
  }
  return <div ref={ref} className="w-full h-72" />
}
