'use client'

import { BlogListSkeleton } from './components/BlogSkeleton'

export default function Loading() {
  return (
    <div className="relative z-10 min-h-[calc(100dvh-3.5rem)] bg-[rgb(var(--bg)/0.8)]">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <BlogListSkeleton count={4} />
      </div>
    </div>
  )
}