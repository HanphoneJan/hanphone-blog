'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search as SearchIcon } from 'lucide-react'
import { buildSearchUrl, type SearchContentType, type SearchResultItem } from '@/lib/api'
import apiClient from '@/lib/utils'
import { API_CODE } from '@/lib/constants'
import { PageHeader, PageShell } from '@/components/shared/PageShell'

interface SearchApiResponse {
  flag: boolean
  code: number
  message: string
  data: SearchResultItem[] | null
}

interface TypeTab {
  value: SearchContentType | null
  label: string
}

const TYPE_TABS: TypeTab[] = [
  { value: null, label: '全部' },
  { value: 'BLOG', label: '博客' },
  { value: 'ESSAY', label: '随笔' },
  { value: 'PROJECT', label: '项目' },
  { value: 'DOC', label: '文档' },
]

const CONTENT_TYPE_LABEL: Record<SearchContentType, string> = {
  BLOG: '博客',
  ESSAY: '随笔',
  PROJECT: '项目',
  DOC: '文档',
}

const SEARCH_LIMIT = 50

function parseType(raw: string | null): SearchContentType | null {
  if (!raw) return null
  const upper = raw.toUpperCase()
  return TYPE_TABS.some(tab => tab.value === upper) ? (upper as SearchContentType) : null
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 把文本按关键词切段（忽略大小写），命中段标记为 match。
 * 只做纯文本切分，不拼 HTML，渲染时用 React 片段 + <mark>。
 */
export function splitByKeyword(text: string, keyword: string): Array<{ text: string; match: boolean }> {
  if (!text) return []
  const terms = Array.from(
    new Set(
      keyword
        .split(/\s+/)
        .map(term => term.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length)

  if (terms.length === 0) return [{ text, match: false }]

  const pattern = new RegExp(terms.map(escapeRegExp).join('|'), 'gi')
  const segments: Array<{ text: string; match: boolean }> = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), match: false })
    }
    segments.push({ text: match[0], match: true })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), match: false })
  }

  return segments
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const segments = useMemo(() => splitByKeyword(text, keyword), [text, keyword])
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))] rounded-sm px-0.5"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  )
}

function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.split('T')[0]
  return date.toLocaleDateString('zh-CN')
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.trim() || ''
  const selectedType = parseType(searchParams.get('type'))

  const [inputValue, setInputValue] = useState(query)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 点击「搜索」但关键词/类型未变化时，用这个计数强制重新请求
  const [reloadKey, setReloadKey] = useState(0)

  // URL 变化（前进/后退、Header 跳转）时同步输入框
  useEffect(() => {
    setInputValue(query)
  }, [query])

  useEffect(() => {
    if (!query) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    let active = true
    setLoading(true)
    setError('')

    apiClient
      .get<SearchApiResponse>(buildSearchUrl(query, selectedType ?? undefined, SEARCH_LIMIT))
      .then(response => {
        if (!active) return
        const body = response.data
        if (!body.flag || body.code !== API_CODE.SUCCESS) {
          throw new Error(body.message || '搜索失败')
        }
        setResults(Array.isArray(body.data) ? body.data : [])
      })
      .catch(() => {
        if (!active) return
        setResults([])
        setError('搜索失败，请稍后重试')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [query, selectedType, reloadKey])

  const pushQuery = useCallback(
    (nextQuery: string, nextType: SearchContentType | null) => {
      const params = new URLSearchParams()
      if (nextQuery) params.set('q', nextQuery)
      if (nextType) params.set('type', nextType)
      const target = `/search/${params.toString() ? `?${params.toString()}` : ''}`
      const current = `/search/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

      if (target === current) {
        // 地址没变（Next 会忽略同地址 push），直接重发一次请求
        if (nextQuery) setReloadKey(key => key + 1)
        return
      }
      router.push(target)
    },
    [router, searchParams]
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    pushQuery(inputValue.trim(), selectedType)
  }

  const handleTabChange = (type: SearchContentType | null) => {
    if (type === selectedType) return
    pushQuery(query, type)
  }

  return (
    <PageShell>
      <PageHeader
        icon={SearchIcon}
        title="搜索"
        description={`在博客、随笔、项目与文档中查找内容，最多显示 ${SEARCH_LIMIT} 条结果。`}
      />

      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="mt-5">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3 w-4 h-4 text-[rgb(var(--text-muted))] pointer-events-none" />
          <input
            type="search"
            value={inputValue}
            onChange={event => setInputValue(event.target.value)}
            placeholder="输入关键词后回车搜索..."
            autoFocus
            className="w-full px-4 py-2.5 pl-9 rounded-lg text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] bg-[rgb(var(--card))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
          />
        </div>
      </form>

      {/* 类型切换 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TYPE_TABS.map(tab => {
          const active = tab.value === selectedType
          return (
            <button
              key={tab.value ?? 'ALL'}
              type="button"
              onClick={() => handleTabChange(tab.value)}
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

      {/* 结果区 */}
      <div className="mt-6">
        {!query && (
          <p className="py-10 text-center text-sm text-[rgb(var(--text-muted))]">
            输入关键词开始搜索
          </p>
        )}

        {query && loading && (
          <div className="space-y-3" aria-label="加载中">
            {[0, 1, 2].map(item => (
              <div
                key={item}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 animate-pulse"
              >
                <div className="h-4 w-1/3 rounded bg-[rgb(var(--border))]" />
                <div className="mt-3 h-3 w-full rounded bg-[rgb(var(--border))]/70" />
                <div className="mt-2 h-3 w-2/3 rounded bg-[rgb(var(--border))]/70" />
              </div>
            ))}
          </div>
        )}

        {query && !loading && error && (
          <div className="py-10 text-center">
            <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(key => key + 1)}
              className="mt-3 px-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
            >
              重试
            </button>
          </div>
        )}

        {query && !loading && !error && results.length === 0 && (
          <p className="py-10 text-center text-sm text-[rgb(var(--text-muted))]">
            没有找到与「{query}」相关的内容
          </p>
        )}

        {query && !loading && !error && results.length > 0 && (
          <>
            <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">
              共 {results.length} 条结果
            </p>
            <ul className="space-y-3">
              {results.map(result => {
                const href = result.url
                const badge = CONTENT_TYPE_LABEL[result.contentType] || '内容'
                const snippet = result.snippet || result.description || ''
                const date = formatDate(result.updateTime)

                const inner = (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                        {badge}
                      </span>
                      <span className="font-medium text-[rgb(var(--text))] break-words">
                        <Highlight text={result.title} keyword={query} />
                      </span>
                      {result.external && (
                        <svg
                          className="w-3 h-3 text-[rgb(var(--text-muted))] shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      )}
                    </div>
                    {snippet && (
                      <p className="mt-2 text-sm text-[rgb(var(--text-muted))] line-clamp-3 break-words">
                        <Highlight text={snippet} keyword={query} />
                      </p>
                    )}
                    {date && (
                      <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{date}</p>
                    )}
                  </>
                )

                return (
                  <li key={`${result.contentType}-${result.id}`}>
                    {result.external ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 transition-none hover:bg-[rgb(var(--hover))]"
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className="block rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 transition-none hover:bg-[rgb(var(--hover))]"
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </PageShell>
  )
}
