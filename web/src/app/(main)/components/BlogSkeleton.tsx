/**
 * 博客列表骨架屏 - 优化动画效果
 */

import { motion, type Variants } from 'framer-motion'

const skeletonVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  }
}

export function BlogSkeleton() {
  return (
    <motion.div
      className='border-b border-[rgb(var(--border))] p-4 rounded-lg py-4'
      variants={skeletonVariants}
      initial='initial'
      animate='animate'
      exit='exit'
    >
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* 博客图片骨架 */}
        <div className='sm:col-span-1'>
          <div className='relative h-40 w-full rounded-lg overflow-hidden shadow-md border border-[rgb(var(--border))]'>
            <div className='absolute inset-0 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)]'></div>
          </div>
        </div>

        {/* 博客信息骨架 */}
        <div className='sm:col-span-2 flex flex-col'>
          {/* 标题骨架 */}
          <div className='h-7 mb-2 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded w-3/4'></div>

          {/* 描述骨架 */}
          <div className='space-y-2 mb-2 grow'>
            <div className='h-4 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded'></div>
            <div className='h-4 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded w-5/6'></div>
            <div className='h-4 animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded w-4/6'></div>
          </div>

          {/* 元信息骨架 */}
          <div className='flex items-center text-sm flex-wrap'>
            <div className='flex items-center mr-4 mb-2 sm:mb-0'>
              <div className='relative h-6 w-6 rounded-full overflow-hidden mr-2 border border-[rgb(var(--border))]'>
                <div className='absolute inset-0 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)]'></div>
              </div>
              <div className='h-4 w-16 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded'></div>
            </div>
            <div className='hidden sm:flex items-center mr-4 mb-2 sm:mb-0'>
              <div className='h-4 w-20 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded'></div>
            </div>
            <div className='flex items-center mr-4 mb-2 sm:mb-0'>
              <div className='h-4 w-12 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded'></div>
            </div>
            <div className='ml-auto'>
              <div className='inline-flex items-center px-2 py-1 h-6 w-20 bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.8)] to-[rgb(var(--muted)/0.6)] rounded text-xs'></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface BlogListSkeletonProps {
  count: number
}

export function BlogListSkeleton({ count }: BlogListSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <BlogSkeleton key={`blog-skeleton-${index}`} />
      ))}
    </>
  )
}
