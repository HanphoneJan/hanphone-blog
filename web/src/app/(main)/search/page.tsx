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

// useSearchParams 需要 Suspense 边界（静态导出时服务端先渲染 fallback）
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-8">
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
      }
    >
      <SearchClient />
    </Suspense>
  )
}
