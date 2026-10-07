'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Radar,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { alertError, alertSuccess } from '@/lib/Alert'
import { API_CODE } from '@/lib/constants'
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
  const [runs, setRuns] = useState<HotCollectRun[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [summaryMeta, setSummaryMeta] = useState<SummarySettings>({ enabled: false, hasApiKey: false })
  const [summaryForm, setSummaryForm] = useState({ baseUrl: '', apiKey: '', model: '', headers: '' })
  const [savingSummary, setSavingSummary] = useState(false)
  const [testingSummary, setTestingSummary] = useState(false)
  const [testResult, setTestResult] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sourcesRes, runsRes] = await Promise.all([
        apiClient.get(ENDPOINTS.HOT.ADMIN_SOURCES),
        apiClient.get(ENDPOINTS.HOT.ADMIN_RUNS),
      ])
      if (sourcesRes.data.code === API_CODE.SUCCESS) {
        setSources(sourcesRes.data.data || [])
      }
      if (runsRes.data.code === API_CODE.SUCCESS) {
        setRuns(runsRes.data.data || [])
      }
    } catch (error) {
      console.error('加载洞察数据源失败:', error)
      alertError('加载洞察数据源失败')
    } finally {
      setLoading(false)
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
      await load()
      alertSuccess('采集完成')
    } catch (error) {
      console.error('触发采集失败:', error)
      alertError('触发采集失败，请稍后重试')
    } finally {
      setCollecting(false)
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
      <h2 className="mb-2 text-sm font-semibold text-[rgb(var(--text))]">最近采集记录</h2>
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
            {runs.length === 0 ? (
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
      </div>
    </div>
  )
}
