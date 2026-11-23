'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
import { LoginRequired, ListSkeleton, PageHeader, PageShell } from '@/components/shared/PageShell'

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
  return (
    <PageShell>
      <LoginRequired
        icon={Bookmark}
        message="登录后才能查看你的收藏"
        skeleton={<ListSkeleton rows={3} />}
      >
        <BookmarksContent />
      </LoginRequired>
    </PageShell>
  )
}

function BookmarksContent() {
  const { token } = useUser()
  const { remove, isPending } = useBookmarks()

  const [tab, setTab] = useState<TabValue>('ALL')
  const [items, setItems] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(
    async (value: TabValue) => {
      if (!token) return
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
    [token]
  )

  useEffect(() => {
    void load(tab)
  }, [tab, load])

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

  return (
    <>
      <PageHeader
        icon={Bookmark}
        title="我的收藏"
        description={
          <>
            收藏的博客、随笔与文档都在这里，点一下即可回到原内容
            {!loading && !error && items.length > 0 ? (
              <>
                {' · '}
                <span className="tabular-nums">共 {items.length} 条</span>
              </>
            ) : null}
          </>
        }
      />

      {/* 类型 Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map(t => {
          const active = t.value === tab
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-sm transition-none ${
                active
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
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
        {loading && <ListSkeleton rows={3} />}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => void load(tab)}
              className="mt-3 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <Bookmark className="mx-auto h-10 w-10 text-[rgb(var(--text-muted))]/40" />
            <p className="mt-3 text-sm text-[rgb(var(--text-muted))]">
              {tab === 'ALL' ? '还没有收藏任何内容' : `还没有收藏${TYPE_LABEL[tab]}`}
            </p>
            <Link
              href="/blog/"
              className="mt-3 inline-block rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
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
              const title = item.title || '（无标题）'

              return (
                <li
                  key={`${item.type}-${item.key}`}
                  className="relative rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-none hover:bg-[rgb(var(--hover))] focus-within:ring-2 focus-within:ring-[rgb(var(--primary))]"
                >
                  {/* 覆盖整张卡片的链接；正文 pointer-events-none 让点击落到它上面 */}
                  <Link
                    href={href}
                    aria-label={`打开${TYPE_LABEL[item.type] || '内容'}：${title}`}
                    className="absolute inset-0 rounded-xl focus:outline-none"
                  />

                  <div className="pointer-events-none relative flex items-start gap-3 p-4">
                    {item.cover && (
                      <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[rgb(var(--hover))]">
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
                        <span className="inline-flex shrink-0 items-center rounded bg-[rgb(var(--primary))]/10 px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--primary))]">
                          {TYPE_LABEL[item.type] || item.type}
                        </span>
                        <span className="line-clamp-1 break-words text-sm font-medium text-[rgb(var(--text))]">
                          {title}
                        </span>
                      </span>

                      {item.subtitle && (
                        <span className="mt-1.5 block line-clamp-2 break-words text-sm text-[rgb(var(--text-muted))]">
                          {item.subtitle}
                        </span>
                      )}

                      <span className="mt-1.5 block text-xs text-[rgb(var(--text-muted))]/80">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (!pending) void handleRemove(item)
                      }}
                      disabled={pending}
                      aria-label={`取消收藏：${title}`}
                      title="取消收藏"
                      className="pointer-events-auto relative z-10 shrink-0 rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border))]/40 hover:text-[rgb(var(--danger))] disabled:cursor-wait disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BookmarkMinus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
