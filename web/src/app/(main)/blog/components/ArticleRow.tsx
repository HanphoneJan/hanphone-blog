'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Eye } from 'lucide-react'
import { ROUTES, ASSETS } from '@/lib/constants'
import type { Blog } from '../types'

interface ArticleRowProps {
  blog: Blog
  index?: number
}

export function ArticleRow({ blog, index = 0 }: ArticleRowProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  // 移动端简化日期显示
  const formatDateMobile = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <Link
        href={ROUTES.BLOG_DETAIL(blog.id)}
        className="block"
      >
        <div className="flex gap-4 p-4 rounded-xl border border-transparent hover:border-[rgb(var(--border))] hover:bg-[rgb(var(--card))] transition-all duration-300">
          {/* 缩略图 - 移动端适当放大 */}
          <div className="relative w-28 h-20 sm:w-32 sm:h-24 md:w-36 md:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[rgb(var(--muted))]">
            {blog.firstPicture ? (
              <Image
                src={blog.firstPicture}
                alt={blog.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 144px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[rgb(var(--primary)/0.8)] to-[rgb(var(--primary-hover)/0.8)] flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {blog.title.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-[rgb(var(--text))] line-clamp-1 mb-2 group-hover:text-[rgb(var(--primary))] transition-colors">
                {blog.title}
              </h3>
              <p className="text-sm text-[rgb(var(--text-muted))] line-clamp-2 hidden sm:block">
                {blog.description}
              </p>
            </div>

            {/* 元信息 - 移动端优化布局 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-[rgb(var(--text-muted))]">
              {/* 第一行：作者、日期、阅读量 */}
              <div className="flex items-center gap-3">
                {/* 作者头像和名字 */}
                <div className="flex items-center gap-1.5">
                  <div className="relative w-4 h-4 rounded-full overflow-hidden border border-[rgb(var(--border))]">
                    <Image
                      src={blog.user.avatar || ASSETS.DEFAULT_AVATAR}
                      alt={blog.user.nickname}
                      fill
                      className="object-cover"
                      sizes="16px"
                    />
                  </div>
                  <span className="truncate max-w-[60px] sm:max-w-[80px]">{blog.user.nickname}</span>
                </div>

                {/* 分隔符 - 桌面端显示 */}
                <span className="hidden sm:inline text-[rgb(var(--border))]">|</span>

                {/* 日期 */}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">{formatDate(blog.createTime)}</span>
                  <span className="sm:hidden">{formatDateMobile(blog.createTime)}</span>
                </span>

                {/* 阅读量 */}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {blog.views}
                </span>
              </div>

              {/* 第二行：分类标签（移动端）/ 右侧（桌面端） */}
              <span className="sm:ml-auto px-2 py-0.5 bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] rounded text-xs w-fit">
                {blog.type.name}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
