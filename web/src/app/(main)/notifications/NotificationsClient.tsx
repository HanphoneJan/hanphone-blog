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
import { LoginRequired, ListSkeleton, PageHeader, PageShell } from '@/components/shared/PageShell'

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
  return (
    <PageShell>
      <LoginRequired
        icon={Bell}
        message="登录后才能查看站内通知"
        skeleton={<ListSkeleton rows={4} />}
      >
        <NotificationsContent />
      </LoginRequired>
    </PageShell>
  )
}

function NotificationsContent() {
  const router = useRouter()
  const { token } = useUser()

  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(
    async (pageNo: number) => {
      if (!token) return
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
    [token]
  )

  useEffect(() => {
    void load(1)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageUnread = useMemo(() => items.filter(item => !item.read).length, [items])

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

  return (
    <>
      <PageHeader
        icon={Bell}
        title="我的通知"
        description={
          <>
            有人评论你的博客或随笔时会出现在这里
            {unread > 0 ? (
              <>
                {' · '}
                <span className="text-[rgb(var(--primary))]">{unread} 条未读</span>
              </>
            ) : null}
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => void handleReadAll()}
            disabled={unread === 0 || markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            全部已读
          </button>
        }
      />

      {/* 筛选（未读只在当前页内过滤） */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'ALL' as Filter, label: '全部' },
              { value: 'UNREAD' as Filter, label: `本页未读${pageUnread > 0 ? `（${pageUnread}）` : ''}` }
            ] as const
          ).map(tab => {
            const active = filter === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm transition-none ${
                  active
                    ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white'
                    : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        {total > 0 ? (
          <span className="text-xs text-[rgb(var(--text-muted))] tabular-nums">共 {total} 条</span>
        ) : null}
      </div>

      <div className="mt-5">
        {loading && <ListSkeleton rows={4} />}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => void load(page)}
              className="mt-3 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <div className="py-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-[rgb(var(--text-muted))]/40" />
            <p className="mt-3 text-sm text-[rgb(var(--text-muted))]">
              {filter === 'UNREAD' ? '本页没有未读通知' : '暂无通知'}
            </p>
            {filter === 'UNREAD' && items.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className="mt-3 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
              >
                查看全部
              </button>
            ) : null}
          </div>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <ul className="space-y-3">
            {visibleItems.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(item)}
                  disabled={busyId === item.id}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-none hover:bg-[rgb(var(--hover))] ${
                    item.read
                      ? 'border-[rgb(var(--border))] bg-[rgb(var(--card))]'
                      : 'border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/5'
                  } ${busyId === item.id ? 'cursor-wait opacity-60' : ''}`}
                >
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[rgb(var(--hover))]">
                    <Image
                      src={item.actorAvatar || ASSETS.DEFAULT_AVATAR}
                      alt={item.actorName || '用户头像'}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded bg-[rgb(var(--primary))]/10 px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--primary))]">
                        {typeLabel(item.type)}
                      </span>
                      <span className="break-all text-sm font-medium text-[rgb(var(--text))]">
                        {item.actorName || '有人'}
                      </span>
                      <span className="text-xs text-[rgb(var(--text-muted))]">
                        {actionText(item)}
                      </span>
                      {!item.read && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--primary))]"
                          aria-label="未读"
                        />
                      )}
                      <span className="ml-auto whitespace-nowrap text-xs text-[rgb(var(--text-muted))]">
                        {formatRelativeTime(item.createTime)}
                      </span>
                    </span>

                    {item.excerpt && (
                      <span className="mt-2 block line-clamp-2 break-words text-sm text-[rgb(var(--text-muted))]">
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

        {!loading && !error && total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </button>
            <span className="tabular-nums text-[rgb(var(--text-muted))]">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
