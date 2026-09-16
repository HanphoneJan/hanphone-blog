'use client'

import { BlogListSkeleton } from './components/BlogSkeleton'

export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <BlogListSkeleton count={4} />
    </div>
  )
}