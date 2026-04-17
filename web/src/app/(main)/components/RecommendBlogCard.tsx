/**
 * 推荐博客卡片组件 - 添加优雅的动画效果
 * 提取为独立组件并用 React.memo 包裹，避免打字机效果每 150ms 触发 Home 重渲染时连带重渲染
 * （根因：backdrop-blur 在子项 repaint 时闪烁）
 */

import React from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ROUTES } from '@/lib/constants'
import { HOME_LABELS } from '@/lib/labels'
import type { Blog } from '../types'

interface RecommendBlogCardProps {
  blog: Blog
  index: number
}

const cardVariants: Variants = {
  initial: { opacity: 0, x: -15 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

export const RecommendBlogCard = React.memo(function RecommendBlogCard({
  blog,
  index
}: RecommendBlogCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial='initial'
      animate='animate'
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={ROUTES.BLOG_DETAIL(blog.id)}
        className='group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-sm bg-[rgb(var(--card)/0.1)] border border-[rgb(var(--border))]'
      >
        <motion.div
          className='relative h-8 w-8 rounded-full flex items-center justify-center shrink-0 mr-3 font-bold text-sm bg-[rgb(var(--card)/0.15)] text-[rgb(var(--primary))] border border-[rgb(var(--border))] shadow-sm'
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          {index + 1}
        </motion.div>
        <div className='flex-1 min-w-0'>
          <motion.h4
            className='text-sm font-medium truncate transition-colors group-hover:text-[rgb(var(--primary))]'
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            {blog.title}
          </motion.h4>
          <div className='flex items-center gap-2 mt-1'>
            <span className='text-xs text-[rgb(var(--text-muted))]'>
              {HOME_LABELS.VIEWS_COUNT(blog.views)}
            </span>
            <span className='text-xs text-[rgb(var(--text-muted))]'>
              {blog.type.name}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

RecommendBlogCard.displayName = 'RecommendBlogCard'
