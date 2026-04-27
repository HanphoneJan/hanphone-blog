'use client'

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

const shimmer = 'animate-shimmer bg-gradient-to-r from-[rgb(var(--muted))] via-[rgb(var(--muted)/0.6)] to-[rgb(var(--muted))] bg-[length:200%_100%]'

interface EssaySkeletonProps {
  isMobile: boolean
}

export function EssaySkeleton({ isMobile }: EssaySkeletonProps) {
  return (
    <motion.div
      className={`${
        isMobile
          ? 'w-full bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm'
          : 'bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm rounded-xl overflow-hidden'
      }`}
      variants={skeletonVariants}
      initial='initial'
      animate='animate'
      exit='exit'
    >
      <div className={`${isMobile ? 'px-4 pt-2 pb-4' : 'p-6'}`}>
        {/* 用户信息骨架 */}
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full shrink-0 ${shimmer}`} />
          <div className="ml-3 flex-1">
            <div className="flex flex-wrap items-center justify-between">
              <div className={`h-4 rounded w-20 ${shimmer}`} />
              <div className={`h-3 rounded w-14 ml-2 ${shimmer}`} />
            </div>
          </div>
        </div>

        {/* 标题骨架 */}
        <div className={`h-6 rounded w-3/4 mb-3 ${shimmer}`} />

        {/* 内容骨架 */}
        <div className="space-y-2 mb-4">
          <div className={`h-4 rounded w-full ${shimmer}`} />
          <div className={`h-4 rounded w-full ${shimmer}`} />
          <div className={`h-4 rounded w-2/3 ${shimmer}`} />
        </div>

        {/* 文件展示区域骨架 */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-0.5">
            <div className={`aspect-video rounded ${shimmer}`} />
            <div className={`aspect-video rounded ${shimmer}`} />
          </div>
        </div>

        {/* 互动区域骨架 */}
        <div className={`flex justify-between items-center ${isMobile ? 'pt-1 pb-2' : 'pt-2 mb-2'}`}>
          <div className={`h-8 rounded-full w-20 ${shimmer}`} />
          <div className={`h-8 rounded-full w-20 ${shimmer}`} />
        </div>

        {/* 评论输入框骨架 */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex-1 h-9 rounded-full ${shimmer}`} />
          <div className={`shrink-0 h-9 w-14 rounded-full ${shimmer}`} />
        </div>

        {/* 评论列表骨架 */}
        <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
          <div className={`flex items-start ${isMobile ? 'p-2 bg-[rgb(var(--muted)/0.3)] rounded' : ''}`}>
            <div className={`w-7 h-7 rounded-full shrink-0 mr-2 ${shimmer}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-3.5 rounded w-14 ${shimmer}`} />
                <div className={`h-3 rounded w-10 ${shimmer}`} />
              </div>
              <div className={`h-3.5 rounded w-full mb-1 ${shimmer}`} />
              <div className={`h-3.5 rounded w-3/4 ${shimmer}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default EssaySkeleton
