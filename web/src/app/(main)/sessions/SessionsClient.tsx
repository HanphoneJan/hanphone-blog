'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  Monitor,
  MonitorSmartphone,
  RefreshCw,
  Smartphone
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { fetchSessions, revokeSession, type UserSessionInfo } from '@/lib/authApi'
import { alertError, alertSuccess } from '@/lib/Alert'
import { formatDateTime } from '@/lib/datetime'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoginRequired, ListSkeleton, PageHeader, PageShell } from '@/components/shared/PageShell'

function isMobileUserAgent(userAgent?: string | null): boolean {
  return /Mobile|Android|iPhone|iPad/i.test(userAgent || '')
}

function deviceName(session: UserSessionInfo): string {
  if (session.deviceName) return session.deviceName

  const ua = session.userAgent || ''
  if (/Android/i.test(ua)) return 'Android 设备'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS 设备'
  if (/Windows/i.test(ua)) return 'Windows 浏览器'
  if (/Macintosh|Mac OS/i.test(ua)) return 'macOS 浏览器'
  if (/Linux/i.test(ua)) return 'Linux 浏览器'
  return '未知设备'
}

function DeviceIcon({ userAgent }: { userAgent?: string | null }) {
  const Icon = isMobileUserAgent(userAgent) ? Smartphone : Monitor
  return <Icon className="h-4 w-4" aria-hidden="true" />
}

function formatTime(value?: string): string {
  return formatDateTime(value) || '—'
}

interface ConfirmState {
  sid: string
  current: boolean
  name: string
}

export default function SessionsClient() {
  return (
    <PageShell>
      <LoginRequired
        icon={MonitorSmartphone}
        message="登录后才能查看登录设备"
        skeleton={<ListSkeleton rows={2} />}
      >
        <SessionsContent />
      </LoginRequired>
    </PageShell>
  )
}

function SessionsContent() {
  const { token, onLogout } = useUser()

  const [sessions, setSessions] = useState<UserSessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySid, setBusySid] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchSessions(token)
      setSessions(list)
    } catch {
      setSessions([])
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const handleRevoke = async () => {
    if (!confirm || !token) return
    const { sid, current, name } = confirm
    setConfirm(null)
    setBusySid(sid)

    try {
      const ok = await revokeSession(token, sid)
      if (!ok) {
        alertError('下线失败，请稍后重试')
        return
      }

      alertSuccess(current ? '当前设备已下线，请重新登录' : `已下线「${name}」`)
      if (current) {
        onLogout()
        return
      }
      await load()
    } catch {
      alertError('下线失败，请稍后重试')
    } finally {
      setBusySid(null)
    }
  }

  const active = sessions
    .filter(session => session.active)
    .sort((a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current)))
  const history = sessions.filter(session => !session.active)

  return (
    <>
      <PageHeader
        icon={MonitorSmartphone}
        title="登录设备"
        description="登录一次可长期在线，refresh 凭证有效 90 天；发现陌生设备可直接下线。"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        }
      />

      <div className="mt-5">
        {loading && <ListSkeleton rows={2} />}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && active.length === 0 && (
          <div className="py-12 text-center">
            <MonitorSmartphone className="mx-auto h-10 w-10 text-[rgb(var(--text-muted))]/40" />
            <p className="mt-3 text-sm text-[rgb(var(--text-muted))]">没有有效会话</p>
          </div>
        )}

        {!loading && !error && active.length > 0 && (
          <ul className="space-y-3">
            {active.map(session => (
              <li
                key={session.sid}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                        <DeviceIcon userAgent={session.userAgent} />
                      </span>
                      <span className="font-medium text-[rgb(var(--text))]">
                        {deviceName(session)}
                      </span>
                      {session.current && (
                        <span className="rounded bg-[rgb(var(--primary))]/10 px-1.5 py-0.5 text-xs text-[rgb(var(--primary))]">
                          当前设备
                        </span>
                      )}
                    </div>

                    <p className="mt-2 break-all text-xs text-[rgb(var(--text-muted))]">
                      {session.ip || '未知 IP'} · 最近使用 {formatTime(session.lastUsedAt)}
                    </p>
                    {session.createdAt && (
                      <p className="mt-0.5 break-all text-xs text-[rgb(var(--text-muted))]/70">
                        登录时间 {formatTime(session.createdAt)}
                      </p>
                    )}
                    {session.userAgent && (
                      <p className="mt-1 line-clamp-2 break-all text-xs text-[rgb(var(--text-muted))]/60">
                        {session.userAgent}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={busySid === session.sid}
                    onClick={() =>
                      setConfirm({
                        sid: session.sid,
                        current: Boolean(session.current),
                        name: deviceName(session)
                      })
                    }
                    className="shrink-0 rounded-lg border border-[rgb(var(--danger))] px-3 py-1.5 text-sm text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger))]/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    {busySid === session.sid ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        下线中
                      </span>
                    ) : (
                      '下线'
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && history.length > 0 && (
          <details className="mt-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/60">
            <summary className="cursor-pointer px-4 py-3 text-sm text-[rgb(var(--text-muted))]">
              已失效 / 已下线的会话（{history.length}）
            </summary>
            <ul className="space-y-2 border-t border-[rgb(var(--border))] p-3">
              {history.map(session => (
                <li
                  key={session.sid}
                  className="rounded-lg border border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--text-muted))]"
                >
                  {deviceName(session)} · {session.ip || '未知 IP'} · 最近使用{' '}
                  {formatTime(session.lastUsedAt)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title="下线设备"
        message={
          confirm
            ? confirm.current
              ? '这是当前设备，下线后会立即退出登录，确定继续吗？'
              : `确定下线「${confirm.name}」吗？该设备的 refresh 凭证将失效。`
            : ''
        }
        confirmText="下线"
        cancelText="取消"
        variant="danger"
        onConfirm={() => void handleRevoke()}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
