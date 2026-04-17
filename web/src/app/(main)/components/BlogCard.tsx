/**
 * 博客卡片组件 - 带有优雅的进入动画
 */

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Eye, Tag as TagIcon, Star } from 'lucide-react'
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
      initial='initial'
      animate='animate'
      exit='exit'
      layout
      style={{ zIndex: index }}
    >
      <Link
        href={ROUTES.BLOG_DETAIL(blog.id)}
        className='block border-b border-[rgb(var(--border))] p-4 hover:bg-[rgb(var(--primary)/0.05)] cursor-pointer transition-all duration-300 rounded-lg py-4'
      >
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {/* 博客图片 */}
          <div className='sm:col-span-1'>
            <motion.div
              className='relative h-40 w-full rounded-lg overflow-hidden shadow-md border border-[rgb(var(--border))]'
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Image
                src={blog.firstPicture}
                alt={blog.title}
                sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px'
                fill
                loading='eager'
                priority={true}
                className='object-fit transition-transform duration-500 hover:scale-105'
              />
            </motion.div>
          </div>

          {/* 博客信息 */}
          <div className='sm:col-span-2 flex flex-col'>
            <motion.h3
              className='text-xl font-semibold mb-2 text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] transition-colors flex items-center'
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              {blog.title}
              {blog.recommend && (
                <motion.span
                  className='ml-2 text-xs bg-yellow-500/15 text-yellow-500 px-1 md:px-2 py-1 rounded-full flex items-center'
                  style={{
                    backgroundColor: 'rgba(250, 204, 21, 0.15)',
                    color: 'rgb(250, 204, 21)',
                    boxShadow: '0 1px 3px -1px rgb(250 204 21 / 0.2)'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
                >
                  <Star
                    className='h-3 w-3 fill-current'
                    style={{ color: 'rgb(250, 204, 21)' }}
                  />
                  <span className='md:inline ml-1 hidden'>推荐</span>
                </motion.span>
              )}
            </motion.h3>
            <p className='text-[rgb(var(--text-muted))] line-clamp-3 mb-4 grow'>
              {blog.description}
            </p>
            <div className='flex items-center text-sm text-[rgb(var(--text-muted))] flex-wrap'>
              <div className='flex items-center mr-4 mb-2 sm:mb-0'>
                <div className='relative h-6 w-6 rounded-full overflow-hidden mr-2 border border-[rgb(var(--border))]'>
                  <Image
                    src={blog.user.avatar || ASSETS.DEFAULT_AVATAR}
                    alt={blog.user.nickname}
                    fill
                    loading='eager'
                    priority={true}
                    className='object-cover w-full h-full'
                  />
                </div>
                <span className='text-[rgb(var(--primary))] font-medium'>
                  {blog.user.nickname}
                </span>
              </div>
              <div className='hidden sm:flex items-center mr-4 mb-2 sm:mb-0'>
                <Calendar className='mr-1 h-4 w-4' />
                <span>{formatDate(blog.createTime)}</span>
              </div>
              <div className='flex items-center mr-4 mb-2 sm:mb-0'>
                <Eye className='mr-1 h-4 w-4' />
                <span>{blog.views}</span>
              </div>
              <div className='ml-auto'>
                <motion.span
                  className='inline-flex items-center px-2 py-1 bg-[rgb(var(--muted))] text-[rgb(var(--primary))] rounded text-xs border border-[rgb(var(--border))] hover:bg-[rgb(var(--primary)/0.1)] hover:text-[rgb(var(--primary-hover))] transition-colors'
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <TagIcon className='mr-1 h-3 w-3' />
                  {blog.type.name}
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
