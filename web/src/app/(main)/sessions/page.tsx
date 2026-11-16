'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { fetchSessions, revokeSession, type UserSessionInfo } from '@/lib/authApi'
import { alertError, alertSuccess } from '@/lib/Alert'

/**
 * 登录设备管理。
 *
 * 数据来自 `/auth/sessions`：每条是「一次登录」（sid），可以单独下线；
 * 当前设备会标出来，下线自己会立即掉登录。
 */
export default function SessionsPage() {
  const router = useRouter()
  const { token, userInfo, onShowLogin } = useUser()
  const [sessions, setSessions] = useState<UserSessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySid, setBusySid] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const list = await fetchSessions(token)
      setSessions(list)
    } catch (e) {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const handleRevoke = async (sid: string) => {
    if (!token) return
    setBusySid(sid)
    try {
      const ok = await revokeSession(token, sid)
      if (ok) {
        alertSuccess('已下线该设备')
        await load()
      } else {
        alertError('下线失败，请稍后重试')
      }
    } catch {
      alertError('下线失败，请稍后重试')
    } finally {
      setBusySid(null)
    }
  }

  const formatTime = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('zh-CN', { hour12: false })
  }

  if (!userInfo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-[rgb(var(--text-muted))] mb-4">登录后才能查看登录设备</p>
        <button
          onClick={onShowLogin}
          className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm"
        >
          去登录
        </button>
      </div>
    )
  }

  const active = sessions.filter((s) => s.active)
  const history = sessions.filter((s) => !s.active)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--text))]">登录设备</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
            登录一次可长期在线，refresh 凭证有效 90 天；发现陌生设备可直接下线。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
          >
            刷新
          </button>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
          >
            返回
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-[rgb(var(--text-muted))]">加载中…</p>}
      {error && <p className="text-sm text-[rgb(var(--danger))]">{error}</p>}

      {!loading && !error && active.length === 0 && (
        <p className="text-sm text-[rgb(var(--text-muted))]">没有有效会话</p>
      )}

      <div className="space-y-3">
        {active.map((s) => (
          <div
            key={s.sid}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[rgb(var(--text))]">{s.deviceName || '未知设备'}</span>
                {s.current && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                    当前设备
                  </span>
                )}
              </div>
              <p className="text-xs text-[rgb(var(--text-muted))] mt-1 break-all">
                {s.ip || '未知 IP'} · 最近使用 {formatTime(s.lastUsedAt)}
              </p>
              <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 break-all line-clamp-2">
                {s.userAgent || ''}
              </p>
            </div>
            <button
              disabled={busySid === s.sid}
              onClick={() => handleRevoke(s.sid)}
              className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--danger))] text-[rgb(var(--danger))] disabled:opacity-50"
            >
              {busySid === s.sid ? '下线中…' : '下线'}
            </button>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-[rgb(var(--text-muted))] cursor-pointer">
            已失效 / 已下线的会话（{history.length}）
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((s) => (
              <div
                key={s.sid}
                className="rounded-lg border border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--text-muted))]"
              >
                {s.deviceName || '未知设备'} · {s.ip || '未知 IP'} · 最近使用 {formatTime(s.lastUsedAt)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
