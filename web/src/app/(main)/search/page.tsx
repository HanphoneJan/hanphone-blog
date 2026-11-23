import type { Metadata } from 'next'
import { Suspense } from 'react'
import SearchClient from './SearchClient'

export const metadata: Metadata = {
  title: '搜索',
  // 搜索结果页不进索引，避免站内搜索结果污染 SEO
  robots: {
    index: false,
    follow: false,
  },
}

// useSearchParams 需要 Suspense 边界（预渲染时服务端先渲染 fallback）
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="relative z-10 min-h-[calc(100dvh-3.5rem)] bg-[rgb(var(--bg)/0.8)]">
          <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
            <div className="h-6 w-20 rounded bg-[rgb(var(--border))] animate-pulse" />
            <div className="mt-5 h-11 w-full rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map(item => (
                <div
                  key={item}
                  className="h-24 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  )
}
