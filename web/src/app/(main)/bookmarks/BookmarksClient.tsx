'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, BookmarkMinus, Loader2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useBookmarks } from '@/contexts/BookmarkContext'
import {
  ENDPOINTS,
  type ApiResult,
  type BookmarkItem,
  type BookmarkType
} from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/datetime'

type TabValue = BookmarkType | 'ALL'

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'BLOG', label: '博客' },
  { value: 'ESSAY', label: '随笔' },
  { value: 'DOC', label: '文档' }
]

const TYPE_LABEL: Record<BookmarkType, string> = {
  BLOG: '博客',
  ESSAY: '随笔',
  DOC: '文档'
}

/** 服务端已给出 url；缺失时按类型兜底拼接 */
function itemHref(item: BookmarkItem): string {
  if (item.url) return item.url
  if (item.type === 'BLOG') return `/blog/${item.key}/`
  if (item.type === 'ESSAY') return `/essays/#${item.key}`
  return `/docs/${encodeURIComponent(item.key)}/`
}

export default function BookmarksClient() {
  const router = useRouter()
  const { token, userInfo, onShowLogin } = useUser()
  const { remove, isPending } = useBookmarks()

  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<TabValue>('ALL')
  const [items, setItems] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const loggedIn = Boolean(token && userInfo)

  useEffect(() => {
    setMounted(true)
  }, [])

  const load = useCallback(
    async (value: TabValue) => {
      if (!token || !userInfo) return
      setLoading(true)
      setError('')
      setActionError('')
      try {
        const response = await apiClient.get<ApiResult<BookmarkItem[] | null>>(
          ENDPOINTS.BOOKMARKS.LIST(value === 'ALL' ? undefined : value)
        )
        const body = response.data
        if (!body.flag || body.code !== API_CODE.SUCCESS) {
          throw new Error(body.message || '获取收藏失败')
        }
        setItems(Array.isArray(body.data) ? body.data : [])
      } catch {
        setItems([])
        setError('加载收藏失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [token, userInfo]
  )

  useEffect(() => {
    if (mounted && loggedIn) void load(tab)
  }, [mounted, loggedIn, tab, load])

  const handleRemove = async (item: BookmarkItem) => {
    setActionError('')
    const result = await remove(item.type, item.key)
    if (result === null) {
      setActionError('取消收藏失败，请稍后重试')
      return
    }
    // Context 已乐观更新；列表同步移除
    setItems(prev => prev.filter(it => !(it.type === item.type && it.key === item.key)))
  }

  const openItem = (item: BookmarkItem) => {
    router.push(itemHref(item))
  }

  // 等 localStorage 里的登录态恢复，避免闪一下登录引导
  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8" aria-label="加载中">
        {[0, 1, 2].map(item => (
          <div
            key={item}
            className="mb-3 h-24 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Bookmark className="w-12 h-12 mx-auto text-[rgb(var(--text-muted))]/40" />
        <p className="mt-4 text-sm text-[rgb(var(--text-muted))]">登录后才能查看你的收藏</p>
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
      <h1 className="text-xl font-semibold text-[rgb(var(--text))]">我的收藏</h1>
      <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
        收藏的博客、随笔与文档都在这里；点一下即可回到原内容。
      </p>

      {/* 类型 Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map(t => {
          const active = t.value === tab
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-sm rounded-full border transition-none ${
                active
                  ? 'bg-[rgb(var(--primary))] border-[rgb(var(--primary))] text-white'
                  : 'bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {actionError && (
        <p className="mt-4 text-sm text-[rgb(var(--danger))]" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-5">
        {loading && (
          <div className="space-y-3" aria-label="加载中">
            {[0, 1, 2].map(item => (
              <div
                key={item}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 flex gap-3 animate-pulse"
              >
                <div className="w-20 h-14 rounded-lg bg-[rgb(var(--border))]" />
                <div className="flex-1">
                  <div className="h-4 w-1/2 rounded bg-[rgb(var(--border))]" />
                  <div className="mt-3 h-3 w-full rounded bg-[rgb(var(--border))]/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => void load(tab)}
              className="mt-3 px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--text-muted))]">
              {tab === 'ALL' ? '还没有收藏任何内容' : `还没有收藏${TYPE_LABEL[tab]}`}
            </p>
            <Link
              href="/blog/"
              className="mt-3 inline-block px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              去逛逛博客
            </Link>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="space-y-3">
            {items.map(item => {
              const pending = isPending(item.type, item.key)
              const href = itemHref(item)
              return (
                <li key={`${item.type}-${item.key}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={event => {
                      // 点取消收藏按钮时不跳转
                      if ((event.target as HTMLElement).closest('button')) return
                      openItem(item)
                    }}
                    onKeyDown={event => {
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openItem(item)
                      }
                    }}
                    className="w-full text-left rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 flex items-start gap-3 cursor-pointer transition-none hover:bg-[rgb(var(--hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
                  >
                    {item.cover && (
                      <span className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-[rgb(var(--muted))]">
                        <Image
                          src={item.cover}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                          {TYPE_LABEL[item.type] || item.type}
                        </span>
                        <span className="text-sm font-medium text-[rgb(var(--text))] line-clamp-1 break-words">
                          {item.title || '（无标题）'}
                        </span>
                      </span>

                      {item.subtitle && (
                        <span className="mt-1.5 block text-sm text-[rgb(var(--text-muted))] line-clamp-2 break-words">
                          {item.subtitle}
                        </span>
                      )}

                      <span className="mt-1.5 block text-xs text-[rgb(var(--text-muted))]/80">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (!pending) void handleRemove(item)
                      }}
                      disabled={pending}
                      aria-label={`取消收藏：${item.title || href}`}
                      title="取消收藏"
                      className="shrink-0 p-1.5 rounded-lg text-[rgb(var(--text-muted))] hover:text-[rgb(var(--danger))] hover:bg-[rgb(var(--border)/0.4)] transition-none disabled:opacity-50 disabled:cursor-wait"
                    >
                      {pending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BookmarkMinus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
