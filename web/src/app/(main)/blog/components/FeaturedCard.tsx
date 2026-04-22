'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Eye, Star } from 'lucide-react'
import { ROUTES, ASSETS } from '@/lib/constants'
import type { Blog } from '../types'

interface FeaturedCardProps {
  blog: Blog
  index?: number
}

export function FeaturedCard({ blog, index = 0 }: FeaturedCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={ROUTES.BLOG_DETAIL(blog.id)}
        className="block h-full"
      >
        <article className="h-full bg-[rgb(var(--card))] rounded-2xl overflow-hidden border border-[rgb(var(--border))] shadow-sm hover:shadow-lg transition-all duration-300">
          {/* 封面图区域 */}
          <div className="relative h-48 overflow-hidden">
            <motion.div
              className="w-full h-full"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
            >
              {blog.firstPicture ? (
                <Image
                  src={blog.firstPicture}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))] flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">
                    {blog.title.charAt(0)}
                  </span>
                </div>
              )}
            </motion.div>
            
            {/* 推荐徽章 */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/90 text-white text-xs font-medium rounded-full shadow-lg backdrop-blur-sm">
                <Star className="w-3 h-3 fill-current" />
                推荐
              </span>
            </div>

            {/* 分类标签 */}
            <div className="absolute bottom-3 left-3">
              <span className="px-2.5 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
                {blog.type.name}
              </span>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2 line-clamp-2 group-hover:text-[rgb(var(--primary))] transition-colors">
              {blog.title}
            </h3>
            <p className="text-sm text-[rgb(var(--text-muted))] line-clamp-2 mb-3">
              {blog.description}
            </p>

            {/* 元信息 */}
            <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(blog.createTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {blog.views}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-[rgb(var(--border))]">
                  <Image
                    src={blog.user.avatar || ASSETS.DEFAULT_AVATAR}
                    alt={blog.user.nickname}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                </div>
                <span className="truncate max-w-[80px]">{blog.user.nickname}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
