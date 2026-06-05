'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, Clock } from 'lucide-react'
import { ASSETS } from '@/lib/constants'
import type { RecommendedBlog } from '../types'

interface RecommendedBlogsProps {
  blogs: RecommendedBlog[]
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function RecommendedBlogs({ blogs }: RecommendedBlogsProps) {
  if (!blogs || blogs.length === 0) return null

  return (
    <motion.section
      className="border-t border-[rgb(var(--border)/0.4)] pt-8 mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <h2 className="blog-text-xl font-bold text-[rgb(var(--text))] mb-6 flex items-center gap-2">
        <span className="w-1 h-5 bg-[rgb(var(--primary))] rounded-full" />
        相关推荐
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {blogs.map((blog, index) => (
          <motion.div
            key={blog.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index + 0.8, duration: 0.4 }}
          >
            <Link
              href={`/blog/${blog.id}`}
              className="group flex gap-3 p-3 rounded-xl bg-[rgb(var(--card)/0.5)] border border-[rgb(var(--border)/0.3)] hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--card))] transition-all duration-300"
            >
              {/* 封面图 */}
              <div className="relative w-24 h-16 sm:w-28 sm:h-[72px] flex-shrink-0 rounded-lg overflow-hidden bg-[rgb(var(--bg))]">
                {blog.firstPicture ? (
                  <Image
                    src={blog.firstPicture}
                    alt={blog.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[rgb(var(--text-muted))] text-xs">
                    无封面
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <h3 className="text-sm font-semibold text-[rgb(var(--text))] line-clamp-2 leading-snug group-hover:text-[rgb(var(--primary))] transition-colors">
                  {blog.title}
                </h3>

                <div className="flex items-center gap-3 mt-1.5 text-[rgb(var(--text-muted))] text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {blog.views}
                  </span>
                  {blog.createTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(blog.createTime)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
