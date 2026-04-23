/**
 * 博客卡片组件 - 杂志风横向卡片
 */

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Eye, Tag as TagIcon, Star, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { ROUTES, ASSETS } from '@/lib/constants'
import { formatDate } from '../utils'
import type { Blog } from '../types'
import { cardVariants } from '@/components/shared/PageTransition'

interface BlogCardProps {
  blog: Blog
  index?: number
}

export function BlogCard({ blog, index = 0 }: BlogCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      style={{ zIndex: index }}
    >
      <Link
        href={ROUTES.BLOG_DETAIL(blog.id)}
        className="group block bg-[rgb(var(--card))] rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex flex-col sm:flex-row">
          {/* 图片区 */}
          <div className="sm:w-[240px] flex-shrink-0">
            <div className="img-zoom-container h-[180px] sm:h-full relative">
              <div
                className="img-bg absolute inset-0"
                style={{ backgroundImage: `url(${blog.firstPicture})` }}
              />
              <div className="img-zoom-overlay" />
              {/* 推荐标记 */}
              {blog.recommend && (
                <div
                  className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(250,204,21,0.9)', color: '#92400e' }}
                >
                  <Star className="w-3 h-3 fill-current" />
                  推荐
                </div>
              )}
            </div>
          </div>

          {/* 内容区 */}
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'rgb(var(--color-7) / 0.1)', color: 'rgb(var(--color-7))' }}
              >
                {blog.type.name}
              </span>
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                {/* 模拟阅读时间 */}
                {Math.max(3, Math.ceil(blog.description.length / 150))} 分钟阅读
              </span>
            </div>

            <h3
              className="text-lg font-bold mb-2 transition-colors group-hover:text-[rgb(var(--primary))]"
              style={{ color: 'rgb(var(--text))' }}
            >
              {blog.title}
            </h3>

            <p className="text-sm line-clamp-2 mb-4 flex-grow" style={{ color: 'rgb(var(--text-muted))' }}>
              {blog.description}
            </p>

            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgb(var(--border))' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden relative">
                  <Image
                    src={blog.user.avatar || ASSETS.DEFAULT_AVATAR}
                    alt={blog.user.nickname}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text))' }}>
                  {blog.user.nickname}
                </span>
                <span className="text-xs hidden sm:inline" style={{ color: 'rgb(var(--text-muted))' }}>
                  {formatDate(blog.createTime)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {blog.views}
                </span>
                <span className="flex items-center gap-1 read-more-arrow" style={{ color: 'rgb(var(--primary))' }}>
                  阅读
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
