'use client'

import { forwardRef } from 'react'

interface LoadMoreProps {
  hasMore: boolean
  isLoading: boolean
}

export const LoadMore = forwardRef<HTMLDivElement, LoadMoreProps>(
  ({ hasMore, isLoading }, ref) => {
    if (!hasMore) return null

    return (
      <div ref={ref} className="w-full py-8 text-center">
        {isLoading ? (
          <div className="flex justify-center items-center gap-2">
            <div className="w-4 h-4 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[rgb(var(--muted-foreground))] text-sm">加载中...</span>
          </div>
        ) : (
          <div className="text-[rgb(var(--muted-foreground))] text-sm">滚动加载更多</div>
        )}
      </div>
    )
  }
)

LoadMore.displayName = 'LoadMore'

export default LoadMore
