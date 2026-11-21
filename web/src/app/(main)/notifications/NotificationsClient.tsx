'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import {
  ENDPOINTS,
  notificationUrl,
  type ApiResult,
  type NotificationItem,
  type NotificationPage
} from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE, ASSETS } from '@/lib/constants'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'

const PAGE_SIZE = 20

const TYPE_LABEL: Record<string, string> = {
  BLOG_COMMENT: '博客评论',
  ESSAY_COMMENT: '随笔评论'
}

function typeLabel(type: string): string {
  return TYPE_LABEL[type] || '评论'
}

function actionText(item: NotificationItem): string {
  const content = item.targetType === 'ESSAY' || item.type === 'ESSAY_COMMENT' ? '随笔' : '博客'
  if (item.parentId) return '回复了你的评论'
  return `评论了你的${content}`
}

type Filter = 'ALL' | 'UNREAD'

export default function NotificationsClient() {
  const router = useRouter()
  const { token, userInfo, onShowLogin } = useUser()

  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const loggedIn = Boolean(token && userInfo)

  useEffect(() => {
    setMounted(true)
  }, [])

  const load = useCallback(
    async (pageNo: number) => {
      if (!token || !userInfo) return
      setLoading(true)
      setError('')
      try {
        const response = await apiClient.get<ApiResult<NotificationPage>>(
          ENDPOINTS.NOTIFICATIONS.LIST(pageNo, PAGE_SIZE)
        )
        const body = response.data
        if (!body.flag || body.code !== API_CODE.SUCCESS) {
          throw new Error(body.message || '获取通知失败')
        }
        const data = body.data
        setItems(Array.isArray(data?.items) ? data.items : [])
        setPage(Number(data?.page) || pageNo)
        setTotal(Number(data?.total) || 0)
        setUnread(Math.max(0, Number(data?.unread) || 0))
      } catch {
        setItems([])
        setError('加载通知失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [token, userInfo]
  )

  useEffect(() => {
    if (mounted && loggedIn) void load(1)
  }, [mounted, loggedIn, load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const visibleItems = useMemo(
    () => (filter === 'UNREAD' ? items.filter(item => !item.read) : items),
    [items, filter]
  )

  const goPage = (next: number) => {
    const target = Math.min(Math.max(1, next), totalPages)
    if (target === page || loading) return
    void load(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpen = async (item: NotificationItem) => {
    const target = notificationUrl(item)

    if (!item.read) {
      setBusyId(item.id)
      try {
        await apiClient.post(ENDPOINTS.NOTIFICATIONS.READ(item.id))
        setItems(prev => prev.map(it => (it.id === item.id ? { ...it, read: true } : it)))
        setUnread(prev => Math.max(0, prev - 1))
        window.dispatchEvent(new Event('blog:notifications-updated'))
      } catch {
        // 标记失败也允许跳转，不阻塞阅读
      } finally {
        setBusyId(null)
      }
    }

    router.push(target)
  }

  const handleReadAll = async () => {
    if (markingAll || unread === 0) return
    setMarkingAll(true)
    try {
      await apiClient.post(ENDPOINTS.NOTIFICATIONS.READ_ALL)
      setUnread(0)
      setItems(prev => prev.map(it => ({ ...it, read: true })))
      window.dispatchEvent(new Event('blog:notifications-updated'))
      void load(page)
    } catch {
      setError('操作失败，请稍后重试')
    } finally {
      setMarkingAll(false)
    }
  }

  // 登录态从 localStorage 恢复前先占位，避免已登录用户看到一闪而过的登录引导
  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8" aria-label="加载中">
        {[0, 1, 2].map(item => (
          <div
            key={item}
            className="mb-3 h-20 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Bell className="w-12 h-12 mx-auto text-[rgb(var(--text-muted))]/40" />
        <p className="mt-4 text-sm text-[rgb(var(--text-muted))]">登录后才能查看站内通知</p>
        <button
          type="button"
          onClick={onShowLogin}
          className="mt-4 px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm hover:bg-[rgb(var(--primary))]/90"
        >
          去登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--text))]">我的通知</h1>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            有人评论你的博客或随笔时会出现在这里。
          </p>
        </div>
        <button
          type="button"
          onClick={handleReadAll}
          disabled={unread === 0 || markingAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {markingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          全部已读
        </button>
      </div>

      {/* 未读筛选（客户端过滤当前页） */}
      <div className="mt-4 flex items-center gap-2">
        {([
          { value: 'ALL' as Filter, label: '全部' },
          { value: 'UNREAD' as Filter, label: `未读${unread > 0 ? `（${unread}）` : ''}` }
        ]).map(tab => {
          const active = filter === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-sm rounded-full border transition-none ${
                active
                  ? 'bg-[rgb(var(--primary))] border-[rgb(var(--primary))] text-white'
                  : 'bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {loading && (
          <div className="space-y-3" aria-label="加载中">
            {[0, 1, 2, 3].map(item => (
              <div
                key={item}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 animate-pulse"
              >
                <div className="h-4 w-1/3 rounded bg-[rgb(var(--border))]" />
                <div className="mt-3 h-3 w-full rounded bg-[rgb(var(--border))]/70" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => void load(page)}
              className="mt-3 px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <p className="py-12 text-center text-sm text-[rgb(var(--text-muted))]">
            {filter === 'UNREAD' ? '当前页没有未读通知' : '暂无通知'}
          </p>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <ul className="space-y-3">
            {visibleItems.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(item)}
                  disabled={busyId === item.id}
                  className={`w-full text-left rounded-xl border p-4 flex items-start gap-3 transition-none hover:bg-[rgb(var(--hover))] ${
                    item.read
                      ? 'border-[rgb(var(--border))] bg-[rgb(var(--card))]'
                      : 'border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/5'
                  } ${busyId === item.id ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <span className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[rgb(var(--muted))]">
                    <Image
                      src={item.actorAvatar || ASSETS.DEFAULT_AVATAR}
                      alt={item.actorName || '用户头像'}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-cover"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                        {typeLabel(item.type)}
                      </span>
                      <span className="text-sm font-medium text-[rgb(var(--text))] break-all">
                        {item.actorName || '有人'}
                      </span>
                      <span className="text-xs text-[rgb(var(--text-muted))]">
                        {actionText(item)}
                      </span>
                      {!item.read && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))] shrink-0"
                          aria-label="未读"
                        />
                      )}
                      <span className="ml-auto text-xs text-[rgb(var(--text-muted))] whitespace-nowrap">
                        {formatRelativeTime(item.createTime)}
                      </span>
                    </span>

                    {item.excerpt && (
                      <span className="mt-2 block text-sm text-[rgb(var(--text-muted))] line-clamp-2 break-words">
                        {item.excerpt}
                      </span>
                    )}

                    <span className="mt-1.5 block text-xs text-[rgb(var(--text-muted))]/70">
                      {formatDateTime(item.createTime)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 分页 */}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>
            <span className="text-[rgb(var(--text-muted))] tabular-nums">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
