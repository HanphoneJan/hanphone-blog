'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import {
  ENDPOINTS,
  notificationUrl,
  type ApiResult,
  type NotificationItem,
  type NotificationPage
} from '@/lib/api'
import apiClient, { isUnauthorizedError } from '@/lib/utils'
import { API_CODE, ASSETS } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/datetime'

/** 未读数轮询间隔 */
const POLL_INTERVAL = 60_000
/** 下拉面板里展示的条数 */
const RECENT_PAGE_SIZE = 6

function actionText(item: NotificationItem): string {
  const content = item.targetType === 'ESSAY' || item.type === 'ESSAY_COMMENT' ? '随笔' : '博客'
  if (item.parentId) return '回复了你的评论'
  return `评论了你的${content}`
}

/**
 * 顶栏通知铃铛：未登录不渲染。
 * 挂载 / 窗口 focus / 每 60s 拉未读数；点开才拉最近几条；
 * 登出或 401 后停止轮询并清零。
 */
export default function NotificationBell({ isTransparent = false }: { isTransparent?: boolean }) {
  const router = useRouter()
  const { token, userInfo } = useUser()
  const loggedIn = Boolean(token && userInfo)

  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  // 401 之后不再发请求（token 可能仍留在内存里）
  const stoppedRef = useRef(false)

  const stopPolling = useCallback(() => {
    stoppedRef.current = true
    setUnread(0)
    setItems([])
    setOpen(false)
  }, [])

  const fetchUnread = useCallback(async () => {
    if (stoppedRef.current || !token || !userInfo) return
    try {
      const response = await apiClient.get<ApiResult<{ count: number }>>(
        ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
      )
      const body = response.data
      if (!body.flag || body.code !== API_CODE.SUCCESS) {
        throw new Error(body.message || '获取未读通知数失败')
      }
      setUnread(Math.max(0, Number(body.data?.count) || 0))
    } catch (error) {
      if (isUnauthorizedError(error)) stopPolling()
    }
  }, [token, userInfo, stopPolling])

  const loadRecent = useCallback(async () => {
    if (stoppedRef.current || !token || !userInfo) return
    setListLoading(true)
    setListError('')
    try {
      const response = await apiClient.get<ApiResult<NotificationPage>>(
        ENDPOINTS.NOTIFICATIONS.LIST(1, RECENT_PAGE_SIZE)
      )
      const body = response.data
      if (!body.flag || body.code !== API_CODE.SUCCESS) {
        throw new Error(body.message || '获取通知失败')
      }
      const page = body.data
      setItems(Array.isArray(page?.items) ? page.items : [])
      setUnread(Math.max(0, Number(page?.unread) || 0))
    } catch (error) {
      if (isUnauthorizedError(error)) {
        stopPolling()
      } else {
        setListError('加载通知失败，请稍后重试')
      }
    } finally {
      setListLoading(false)
    }
  }, [token, userInfo, stopPolling])

  // 登录态变化：重启/停止轮询
  useEffect(() => {
    if (!loggedIn) {
      stoppedRef.current = false
      setUnread(0)
      setItems([])
      setOpen(false)
      return
    }

    stoppedRef.current = false
    void fetchUnread()

    const interval = window.setInterval(() => {
      // 后台标签页跳过，省请求也避免无意义的 401
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void fetchUnread()
      }
    }, POLL_INTERVAL)
    const handleFocus = () => {
      void fetchUnread()
    }
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void fetchUnread()
    }
    // 通知页标记已读后同步顶栏角标（Header 跨路由常驻，不会重新挂载）
    const handleUpdated = () => {
      void fetchUnread()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('blog:notifications-updated', handleUpdated)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('blog:notifications-updated', handleUpdated)
    }
  }, [loggedIn, fetchUnread])

  // 点击外部 / Esc 关闭面板
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleToggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    void loadRecent()
  }

  const goTo = (target: string) => {
    // 已在随笔页时 Next 的软导航只改 hash、不触发 hashchange；直接改 location.hash 交给 EssayClient 平滑定位
    if (target.startsWith('/essays/#') && window.location.pathname.startsWith('/essays')) {
      // '/essays/#123' → '#123'（不能按 '/essays'.length 切，那会得到 '/#123' → location.hash 变成 '#/#123'）
      const hashIndex = target.indexOf('#')
      if (hashIndex >= 0) {
        window.location.hash = target.slice(hashIndex)
        return
      }
    }
    router.push(target)
  }

  const handleItemClick = async (item: NotificationItem) => {
    const target = notificationUrl(item)
    setOpen(false)

    if (!item.read) {
      setBusyId(item.id)
      try {
        await apiClient.post(ENDPOINTS.NOTIFICATIONS.READ(item.id))
        setUnread(prev => Math.max(0, prev - 1))
        setItems(prev => prev.map(it => (it.id === item.id ? { ...it, read: true } : it)))
      } catch (error) {
        // 标记失败也允许跳转
        if (isUnauthorizedError(error)) stoppedRef.current = true
      } finally {
        setBusyId(null)
      }
    }

    goTo(target)
  }

  const handleReadAll = async () => {
    if (markingAll || unread === 0) return
    setMarkingAll(true)
    try {
      await apiClient.post(ENDPOINTS.NOTIFICATIONS.READ_ALL)
      setUnread(0)
      setItems(prev => prev.map(it => ({ ...it, read: true })))
      void loadRecent()
    } catch (error) {
      if (isUnauthorizedError(error)) stoppedRef.current = true
    } finally {
      setMarkingAll(false)
    }
  }

  // 未登录：不占位、不发请求
  if (!loggedIn) return null

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={unread > 0 ? `通知，${unread} 条未读` : '通知'}
        aria-haspopup="menu"
        aria-expanded={open}
        title="通知"
        className={`relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full transition-none ${
          isTransparent
            ? 'hover:bg-[rgb(var(--bg)/0.2)]'
            : 'bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))] border border-[rgb(var(--border))]'
        }`}
      >
        <Bell className="h-5 w-5 text-[rgb(var(--primary))]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[rgb(var(--danger))] text-white text-[10px] leading-[18px] text-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-80 max-w-[calc(100vw-1rem)] bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg shadow-lg z-1000 overflow-hidden max-sm:fixed max-sm:top-14 max-sm:left-2 max-sm:right-2 max-sm:mt-0 max-sm:w-auto max-sm:max-w-none">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--border))]">
            <span className="text-sm font-medium text-[rgb(var(--text))]">
              通知
              {unread > 0 && (
                <span className="ml-1.5 text-xs text-[rgb(var(--text-muted))]">
                  {unread} 条未读
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={handleReadAll}
              disabled={unread === 0 || markingAll}
              className="inline-flex items-center gap-1 text-xs text-[rgb(var(--primary))] disabled:text-[rgb(var(--text-muted))] disabled:opacity-50 transition-none"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              全部已读
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {listLoading && (
              <div className="px-3 py-8 flex items-center justify-center text-xs text-[rgb(var(--text-muted))]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                加载中…
              </div>
            )}

            {!listLoading && listError && (
              <div className="px-3 py-8 text-center">
                <p className="text-xs text-[rgb(var(--danger))]">{listError}</p>
                <button
                  type="button"
                  onClick={() => void loadRecent()}
                  className="mt-2 text-xs px-2.5 py-1 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
                >
                  重试
                </button>
              </div>
            )}

            {!listLoading && !listError && items.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-[rgb(var(--text-muted))]">
                暂无通知
              </p>
            )}

            {!listLoading && !listError && items.length > 0 && (
              <ul>
                {items.map(item => (
                  <li key={item.id} className="border-b border-[rgb(var(--border))] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => void handleItemClick(item)}
                      disabled={busyId === item.id}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-none hover:bg-[rgb(var(--hover))] ${
                        busyId === item.id ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <span className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[rgb(var(--muted))]">
                        <Image
                          src={item.actorAvatar || ASSETS.DEFAULT_AVATAR}
                          alt={item.actorName || '用户头像'}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[rgb(var(--text))] truncate">
                            {item.actorName || '有人'}
                          </span>
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))] shrink-0" />
                          )}
                        </span>
                        <span className="block text-xs text-[rgb(var(--text-muted))] truncate">
                          {actionText(item)}
                        </span>
                        {item.excerpt && (
                          <span className="block mt-0.5 text-xs text-[rgb(var(--text-muted))] line-clamp-2 break-words">
                            {item.excerpt}
                          </span>
                        )}
                        <span className="block mt-1 text-[11px] text-[rgb(var(--text-muted))]/80">
                          {formatRelativeTime(item.createTime)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push('/notifications/')
            }}
            className="w-full py-2 text-center text-xs text-[rgb(var(--primary))] border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] transition-none"
          >
            查看全部
          </button>
        </div>
      )}
    </div>
  )
}
