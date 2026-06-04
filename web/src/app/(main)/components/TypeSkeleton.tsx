/**
 * 分类骨架屏
 */

export function TypeSkeleton() {
  return (
    <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--primary)/0.05)] cursor-pointer transition-colors">
      <div className="flex items-center">
        <div className="relative h-6 w-6 rounded-full overflow-hidden mr-2 border border-[rgb(var(--border))]">
          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] animate-shimmer"></div>
        </div>
        <div className="h-4 w-16 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded animate-shimmer"></div>
      </div>
      <div className="bg-[rgb(var(--muted))] text-xs px-2 py-0.5 rounded h-5 w-8 flex items-center justify-center">
        <div className="h-3 w-3 bg-[rgb(var(--muted)/0.8)] rounded animate-pulse"></div>
      </div>
    </div>
  )
}

interface TypeSkeletonListProps {
  count: number
}

export function TypeSkeletonList({ count }: TypeSkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TypeSkeleton key={`type-skeleton-${index}`} />
      ))}
    </>
  )
}
