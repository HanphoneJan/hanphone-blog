/**
 * 博客列表组件 - 杂志风卡片列表
 */

import { motion, AnimatePresence } from 'framer-motion'
import { BlogCard } from './BlogCard'
import { BlogListSkeleton } from './BlogSkeleton'
import { staggerContainerVariants, skeletonVariants } from '@/components/shared/PageTransition'
import type { Blog } from '../types'

interface BlogListProps {
  blogs: Blog[]
  loading: boolean
  visible: boolean
  pageSize: number
}

export function BlogList({ blogs, loading, visible, pageSize }: BlogListProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence mode='wait'>
        {loading ? (
          <motion.div
            key='skeleton'
            variants={skeletonVariants}
            initial='initial'
            exit='exit'
          >
            <BlogListSkeleton count={pageSize} />
          </motion.div>
        ) : (
          <motion.div
            key='content'
            className={`space-y-4 transition-opacity duration-500 ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
            variants={staggerContainerVariants}
            initial='initial'
            animate='animate'
            layout
          >
            {blogs.map((blog, index) => (
              <BlogCard key={blog.id} blog={blog} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
