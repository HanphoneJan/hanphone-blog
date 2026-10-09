'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Radar,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  ListRestart,
} from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { alertError, alertSuccess, showAlert } from '@/lib/Alert'
import { API_CODE } from '@/lib/constants'
import { Pagination } from '@/components/shared/Pagination'
import type { HotSourceStatus } from '@/app/(main)/insight/types'

interface HotCollectRun {
  id: number
  triggerType: string
  startedAt: string | null
  finishedAt: string | null
  totalSources: number
  successCount: number
  failedCount: number
  detail: string | null
}

interface RunsPage {
  content: HotCollectRun[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface RebuildSummary {
  dryRun: boolean
  totalEntities: number
  groupsMerged: number
  entitiesRemoved: number
  keysChanged: number
  changes: { newKey: string; keptFrom: string; keptName: string; removed: string[] }[]
}

/** 采集记录筛选条件（全部为空 = 不过滤） */
interface RunFilters {
  triggerType: string
  result: string
  q: string
  from: string
  to: string
  order: string
}

const EMPTY_RUN_FILTERS: RunFilters = {
  triggerType: '',
  result: '',
  q: '',
  from: '',
  to: '',
  order: 'newest',
}

/** 计算分页组件需要的可见页码（最多 5 个，围绕当前页） */
function pageWindow(current: number, total: number): number[] {
  const maxVisible = 5
  const pages: number[] = []
  let start = Math.max(1, current - Math.floor(maxVisible / 2))
  const end = Math.min(total, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

interface SummarySettings {
  baseUrl?: string | null
  model?: string | null
  headers?: string | null
  enabled: boolean
  hasApiKey: boolean
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', { hour12: false })
}

export default function AdminInsightPage() {
  const [sources, setSources] = useState<HotSourceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [summaryMeta, setSummaryMeta] = useState<SummarySettings>({ enabled: false, hasApiKey: false })
  const [summaryForm, setSummaryForm] = useState({ baseUrl: '', apiKey: '', model: '', headers: '' })
  const [savingSummary, setSavingSummary] = useState(false)
  const [testingSummary, setTestingSummary] = useState(false)
  const [testResult, setTestResult] = useState('')

  // 采集记录：服务端分页 + 筛选 + 排序
  const [runs, setRuns] = useState<HotCollectRun[]>([])
  const [runTotal, setRunTotal] = useState(0)
  const [runPage, setRunPage] = useState(0)
  const [runSize, setRunSize] = useState(10)
  const [runFilters, setRunFilters] = useState<RunFilters>(EMPTY_RUN_FILTERS)
  const [qInput, setQInput] = useState('')
  const [runsLoading, setRunsLoading] = useState(false)

  // 模型归一重建
  const [rebuildBusy, setRebuildBusy] = useState(false)
  const [rebuildSummary, setRebuildSummary] = useState<RebuildSummary | null>(null)

  const runTotalPages = Math.max(1, Math.ceil(runTotal / runSize))
  const visibleRunPages = useMemo(() => pageWindow(runPage + 1, runTotalPages), [runPage, runTotalPages])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sourcesRes = await apiClient.get(ENDPOINTS.HOT.ADMIN_SOURCES)
      if (sourcesRes.data.code === API_CODE.SUCCESS) {
        setSources(sourcesRes.data.data || [])
      }
    } catch (error) {
      console.error('加载洞察数据源失败:', error)
      alertError('加载洞察数据源失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRuns = useCallback(async (page: number, size: number, filters: RunFilters) => {
    setRunsLoading(true)
    try {
      const res = await apiClient.get(
        ENDPOINTS.HOT.ADMIN_RUNS_PAGE({
          page,
          size,
          triggerType: filters.triggerType,
          result: filters.result,
          q: filters.q,
          from: filters.from,
          to: filters.to,
          order: filters.order,
        })
      )
      if (res.data.code === API_CODE.SUCCESS) {
        const data = res.data.data as RunsPage
        setRuns(data.content || [])
        setRunTotal(data.totalElements || 0)
      }
    } catch (error) {
      console.error('加载采集记录失败:', error)
      alertError('加载采集记录失败')
    } finally {
      setRunsLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.HOT.SUMMARY_SETTINGS)
      if (res.data.code === API_CODE.SUCCESS && res.data.data) {
        const d = res.data.data as SummarySettings
        setSummaryMeta(d)
        setSummaryForm((f) => ({ ...f, baseUrl: d.baseUrl || '', model: d.model || '', headers: d.headers || '' }))
      }
    } catch (error) {
      console.error('加载摘要配置失败:', error)
    }
  }, [])

  useEffect(() => {
    load()
    loadSummary()
  }, [load, loadSummary])

  // 筛选/每页条数变化时回到第一页
  const updateFilters = useCallback((patch: Partial<RunFilters>) => {
    setRunFilters((f) => ({ ...f, ...patch }))
    setRunPage(0)
  }, [])

  // 关键词防抖（350ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      setRunFilters((f) => (f.q === qInput ? f : { ...f, q: qInput }))
      setRunPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [qInput])

  useEffect(() => {
    loadRuns(runPage, runSize, runFilters)
  }, [runPage, runSize, runFilters, loadRuns])

  const saveSummary = async () => {
    setSavingSummary(true)
    try {
      const res = await apiClient.put(ENDPOINTS.HOT.SUMMARY_SETTINGS, summaryForm)
      if (res.data.code === API_CODE.SUCCESS) {
        setSummaryMeta(res.data.data as SummarySettings)
        setSummaryForm((f) => ({ ...f, apiKey: '' }))
        alertSuccess('摘要配置已保存')
      } else {
        alertError(res.data.message || '保存失败')
      }
    } catch (error) {
      console.error('保存摘要配置失败:', error)
      alertError('保存摘要配置失败')
    } finally {
      setSavingSummary(false)
    }
  }

  const testSummary = async () => {
    setTestingSummary(true)
    setTestResult('')
    try {
      const res = await apiClient.post(ENDPOINTS.HOT.SUMMARY_TEST)
      setTestResult(
        res.data.code === API_CODE.SUCCESS
          ? `成功：${res.data.data}`
          : `失败：${res.data.message || '未知错误'}`
      )
    } catch (error) {
      console.error('测试摘要失败:', error)
      setTestResult('失败：请求异常')
    } finally {
      setTestingSummary(false)
    }
  }

  const handleCollect = async () => {
    setCollecting(true)
    try {
      const res = await apiClient.post(ENDPOINTS.HOT.ADMIN_COLLECT)
      if (res.data.code !== API_CODE.SUCCESS) {
        alertError(res.data.message || '触发失败')
        return
      }
      // 采集为后台异步执行，轮询状态直至完成（最长约 3 分钟）
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const st = await apiClient.get(ENDPOINTS.HOT.ADMIN_STATUS)
          if (st.data.code === API_CODE.SUCCESS && !st.data.data?.running) break
        } catch {
          /* 忽略单次轮询失败 */
        }
      }
      await Promise.all([load(), loadRuns(runPage, runSize, runFilters)])
      alertSuccess('采集完成')
    } catch (error) {
      console.error('触发采集失败:', error)
      alertError('触发采集失败，请稍后重试')
    } finally {
      setCollecting(false)
    }
  }

  const runRebuild = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm('将按当前归一规则合并历史重复模型实体（会删除多余实体并重指榜单数据），确定执行？')) {
      return
    }
    setRebuildBusy(true)
    try {
      const res = await apiClient.post(ENDPOINTS.HOT.ADMIN_REBUILD_NORMALIZATION(dryRun))
      if (res.data.code === API_CODE.SUCCESS) {
        setRebuildSummary(res.data.data as RebuildSummary)
        if (dryRun) {
          showAlert('预演完成，见下方结果', { type: 'info' })
        } else {
          await Promise.all([load(), loadRuns(runPage, runSize, runFilters)])
          alertSuccess('重建完成')
        }
      } else {
        alertError(res.data.message || '操作失败')
      }
    } catch (error) {
      console.error('模型归一重建失败:', error)
      alertError('模型归一重建失败')
    } finally {
      setRebuildBusy(false)
    }
  }

  const healthyCount = sources.filter((s) => s.lastStatus === 'SUCCESS').length

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-4"
      >
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-[rgb(var(--primary))]" />
          <h1 className="text-xl font-bold text-[rgb(var(--text))]">聚合数据</h1>
          {sources.length > 0 && (
            <span className="text-xs text-[rgb(var(--text-muted))]">
              {healthyCount}/{sources.length} 正常
            </span>
          )}
        </div>
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] disabled:opacity-60 transition-colors"
        >
          {collecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {collecting ? '采集中…' : '手动触发采集'}
        </button>
      </motion.div>

      {/* AI 摘要配置 */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
            AI 摘要配置（OpenAI 兼容接口）
          </h2>
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              summaryMeta.enabled
                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                : 'bg-[rgb(var(--hover))] text-[rgb(var(--text-muted))]'
            }`}
          >
            {summaryMeta.enabled ? '已启用' : '未启用'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs text-[rgb(var(--text-muted))]">
            接口地址（Base URL）
            <input
              value={summaryForm.baseUrl}
              onChange={(e) => setSummaryForm((f) => ({ ...f, baseUrl: e.target.value }))}
              placeholder="https://api.deepseek.com/v1"
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
            />
          </label>
          <label className="text-xs text-[rgb(var(--text-muted))]">
            模型
            <input
              value={summaryForm.model}
              onChange={(e) => setSummaryForm((f) => ({ ...f, model: e.target.value }))}
              placeholder="deepseek-chat"
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
            />
          </label>
          <label className="text-xs text-[rgb(var(--text-muted))]">
            API Key
            <input
              type="password"
              value={summaryForm.apiKey}
              onChange={(e) => setSummaryForm((f) => ({ ...f, apiKey: e.target.value }))}
              placeholder={summaryMeta.hasApiKey ? '已配置，留空则不修改' : 'sk-...'}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs text-[rgb(var(--text-muted))]">
          自定义请求头（每行一条 <code>Key: Value</code>，可留空）
          <textarea
            value={summaryForm.headers}
            onChange={(e) => setSummaryForm((f) => ({ ...f, headers: e.target.value }))}
            rows={3}
            placeholder={'x-opencode-session: your-session-token\nX-Custom-Header: value'}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-mono bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={saveSummary}
            disabled={savingSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] disabled:opacity-60"
          >
            {savingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            保存
          </button>
          <button
            onClick={testSummary}
            disabled={testingSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-60"
          >
            {testingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            测试
          </button>
          {testResult ? (
            <span className="text-xs text-[rgb(var(--text-muted))] max-w-full truncate">
              {testResult}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
          配置后，采集时会为英文热点条目生成中文摘要（已有摘要的条目不重复生成）。
        </p>
      </div>

      {/* 模型归一重建 */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-[rgb(var(--text))]">模型归一重建</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runRebuild(true)}
              disabled={rebuildBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-60"
            >
              {rebuildBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              预演
            </button>
            <button
              onClick={() => runRebuild(false)}
              disabled={rebuildBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] disabled:opacity-60"
            >
              {rebuildBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListRestart className="w-4 h-4" />}
              执行重建
            </button>
          </div>
        </div>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          按当前归一规则重算 <code>canonical_key</code>，合并历史重复实体（如 <code>spacexai:grok-4-7</code> 与{' '}
          <code>xai:grok-4-7</code>）。建议先「预演」查看影响再执行；执行会重指榜单 / 别名 / 价格并删除多余实体。
        </p>
        {rebuildSummary && (
          <div className="mt-3 text-xs">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[rgb(var(--text))]">
              <span className={rebuildSummary.dryRun ? 'text-amber-500' : 'text-green-600 dark:text-green-400'}>
                {rebuildSummary.dryRun ? '预演结果' : '已执行'}
              </span>
              <span>实体总数 {rebuildSummary.totalEntities}</span>
              <span>合并组 {rebuildSummary.groupsMerged}</span>
              <span>删除实体 {rebuildSummary.entitiesRemoved}</span>
              <span>变更 key {rebuildSummary.keysChanged}</span>
            </div>
            {rebuildSummary.changes?.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[rgb(var(--border))] divide-y divide-[rgb(var(--border))]">
                {rebuildSummary.changes.map((c, i) => (
                  <div key={i} className="px-3 py-2">
                    <div className="font-mono text-[rgb(var(--text))] break-all">
                      {c.keptFrom} → {c.newKey}
                    </div>
                    {c.removed?.length > 0 && (
                      <div className="text-[rgb(var(--text-muted))] break-all">
                        并入：{c.removed.join('、')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 信源表 */}
      <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[rgb(var(--text-muted))] border-b border-[rgb(var(--border))]">
              <th className="px-4 py-3 font-medium">信源</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">条目数</th>
              <th className="px-4 py-3 font-medium">最后成功</th>
              <th className="px-4 py-3 font-medium">最后错误</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  暂无信源，点击「手动触发采集」初始化
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr
                  key={s.sourceKey}
                  className="border-b border-[rgb(var(--border))] last:border-0"
                >
                  <td className="px-4 py-3">
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[rgb(var(--text))] hover:text-[rgb(var(--primary))]"
                    >
                      {s.displayName || s.sourceKey}
                    </a>
                    <div className="text-xs text-[rgb(var(--text-muted))]">{s.sourceKey}</div>
                  </td>
                  <td className="px-4 py-3">
                    {s.lastStatus === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" /> 正常
                      </span>
                    ) : s.lastStatus === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" /> 失败
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[rgb(var(--text-muted))]">
                        <Clock className="w-4 h-4" /> 未运行
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[rgb(var(--text))]">{s.itemCount ?? 0}</td>
                  <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                    {formatDateTime(s.lastSuccessAt)}
                  </td>
                  <td className="px-4 py-3 max-w-[22rem]">
                    {s.lastError ? (
                      <span
                        className="inline-flex items-start gap-1 text-xs text-red-500"
                        title={s.lastError}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="truncate">{s.lastError}</span>
                      </span>
                    ) : (
                      <span className="text-[rgb(var(--text-muted))]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 采集记录 */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
          采集记录
          <span className="ml-2 text-xs font-normal text-[rgb(var(--text-muted))]">共 {runTotal} 条</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={runFilters.triggerType}
            onChange={(e) => updateFilters({ triggerType: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
          >
            <option value="">全部方式</option>
            <option value="MANUAL">手动</option>
            <option value="SCHEDULED">定时</option>
          </select>
          <select
            value={runFilters.result}
            onChange={(e) => updateFilters({ result: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
          >
            <option value="">全部结果</option>
            <option value="success">全部成功</option>
            <option value="partial">部分失败</option>
            <option value="failed">全部失败</option>
          </select>
          <select
            value={runFilters.order}
            onChange={(e) => updateFilters({ order: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
          >
            <option value="newest">时间倒序</option>
            <option value="oldest">时间正序</option>
          </select>
          <input
            type="date"
            value={runFilters.from}
            onChange={(e) => updateFilters({ from: e.target.value })}
            title="开始日期"
            className="px-2 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
          />
          <span className="text-xs text-[rgb(var(--text-muted))]">~</span>
          <input
            type="date"
            value={runFilters.to}
            onChange={(e) => updateFilters({ to: e.target.value })}
            title="结束日期"
            className="px-2 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="搜索明细…"
              className="w-44 pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)]"
            />
          </div>
          {(runFilters.triggerType ||
            runFilters.result ||
            runFilters.q ||
            runFilters.from ||
            runFilters.to ||
            runFilters.order !== 'newest') && (
            <button
              onClick={() => {
                setQInput('')
                setRunFilters(EMPTY_RUN_FILTERS)
                setRunPage(0)
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))]"
            >
              重置
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[rgb(var(--text-muted))] border-b border-[rgb(var(--border))]">
              <th className="px-4 py-3 font-medium">开始时间</th>
              <th className="px-4 py-3 font-medium">触发方式</th>
              <th className="px-4 py-3 font-medium">结果</th>
              <th className="px-4 py-3 font-medium">明细</th>
            </tr>
          </thead>
          <tbody>
            {runsLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                  暂无记录
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b border-[rgb(var(--border))] last:border-0">
                  <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                    {formatDateTime(r.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-[rgb(var(--text))]">
                    {r.triggerType === 'MANUAL' ? '手动' : '定时'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.failedCount > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                      }
                    >
                      {r.successCount}/{r.totalSources}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[24rem]">
                    <span className="text-xs text-[rgb(var(--text-muted))] whitespace-pre-wrap line-clamp-3">
                      {r.detail || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[rgb(var(--border))]">
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <span>每页</span>
            <select
              value={runSize}
              onChange={(e) => {
                setRunSize(Number(e.target.value))
                setRunPage(0)
              }}
              className="px-2 py-1 rounded-lg text-xs bg-[rgb(var(--bg))] border border-[rgb(var(--border))] text-[rgb(var(--text))]"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
          <Pagination
            currentPage={runPage + 1}
            totalPages={runTotalPages}
            visiblePages={visibleRunPages}
            hasNextPage={runPage + 1 < runTotalPages}
            hasPrevPage={runPage > 0}
            onPageChange={(p) => setRunPage(p - 1)}
            onNextPage={() => setRunPage((p) => Math.min(p + 1, runTotalPages - 1))}
            onPrevPage={() => setRunPage((p) => Math.max(p - 1, 0))}
            onFirstPage={() => setRunPage(0)}
            onLastPage={() => setRunPage(runTotalPages - 1)}
          />
          <span className="text-xs text-[rgb(var(--text-muted))]">
            第 {runPage + 1} / {runTotalPages} 页
          </span>
        </div>
      </div>
    </div>
  )
}
