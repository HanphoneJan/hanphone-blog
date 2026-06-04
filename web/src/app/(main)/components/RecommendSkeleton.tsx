/**
 * 推荐博客骨架屏 - 优化动画效果
 */

import { motion, type Variants } from 'framer-motion'

const skeletonVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  }
}

export function RecommendSkeleton() {
  return (
    <motion.div
      className='flex items-center p-2 hover:bg-[rgb(var(--primary)/0.05)] rounded cursor-pointer transition-colors'
      variants={skeletonVariants}
      initial='initial'
      animate='animate'
      exit='exit'
    >
      <div className='relative h-6 w-6 rounded-full overflow-hidden mr-2 border border-[rgb(var(--border))] bg-[rgb(var(--muted))] flex items-center justify-center shrink-0'>
        <div className='h-2 w-2 bg-[rgb(var(--muted))] rounded-full animate-pulse'></div>
      </div>
      <div className='h-4 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded animate-shimmer flex-1'></div>
    </motion.div>
  )
}

interface RecommendSkeletonListProps {
  count: number
}

export function RecommendSkeletonList({ count }: RecommendSkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <RecommendSkeleton key={`rec-skeleton-${index}`} />
      ))}
    </>
  )
}
