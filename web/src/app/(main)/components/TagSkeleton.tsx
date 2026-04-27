/**
 * 标签骨架屏
 */

import { Tag as TagIcon } from 'lucide-react'

export function TagSkeleton() {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-[rgb(var(--muted))] rounded-full text-sm border border-[rgb(var(--border))] hover:bg-[rgb(var(--primary)/0.05)] cursor-pointer transition-colors">
      <TagIcon className="mr-1 h-3 w-3 text-[rgb(var(--text-muted))]" />
      <div className="h-3 w-12 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded animate-shimmer"></div>
      <span className="ml-1 bg-[rgb(var(--muted)/0.8)] text-xs rounded-full px-1.5 h-4 w-4 flex items-center justify-center">
        <div className="h-2 w-2 bg-[rgb(var(--muted)/0.6)] rounded-full animate-pulse"></div>
      </span>
    </span>
  )
}

interface TagSkeletonListProps {
  count: number
}

export function TagSkeletonList({ count }: TagSkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TagSkeleton key={`tag-skeleton-${index}`} />
      ))}
    </>
  )
}
