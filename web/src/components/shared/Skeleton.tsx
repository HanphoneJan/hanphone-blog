'use client'

/**
 * 骨架屏基础块：带脉冲动画的占位条，供各列表页拼装与自身布局贴近的骨架屏，
 * 避免数据加载期间页面"空一片、看起来没反应"。
 *
 * 用法：<SkeletonBlock className="h-4 w-32 rounded" />
 */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-[rgb(var(--hover))] ${className}`}
    />
  )
}

export default SkeletonBlock
