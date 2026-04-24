'use client'

import Link from 'next/link'
import { Calendar, Eye, Star } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { formatDate } from '../utils'
import type { Blog } from '../types'

interface FeaturedSectionProps {
  recommendList: Blog[]
}

export function FeaturedSection({ recommendList }: FeaturedSectionProps) {
  if (!recommendList || recommendList.length === 0) return null

  const featured = recommendList[0]
  const sideCards = recommendList.slice(1, 4)

  return (
    <section className="py-8 content-fade-in relative z-10">
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-1 h-5 rounded-full"
          style={{ background: 'linear-gradient(to bottom, rgb(var(--color-7)), rgb(var(--color-4)))' }}
        />
        <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--text))' }}>推荐博客</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-2"
          style={{ background: 'rgb(var(--color-7) / 0.1)', color: 'rgb(var(--color-7))' }}
        >
          Recommended BLOG
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 左侧大图精选 - 图文分离布局 */}
        {featured && (
          <div className="lg:col-span-3 animate-slide-up">
            <Link
              href={ROUTES.BLOG_DETAIL(featured.id)}
              className="group block rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg border"
              style={{
                background: 'rgb(var(--card))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              {/* 图片区 */}
              <div className="img-zoom-container relative h-[200px] sm:h-[240px] w-full overflow-hidden">
                {featured.firstPicture || featured.type?.pic_url ? (
                  <div
                    className="img-bg absolute inset-0"
                    style={{ backgroundImage: `url(${featured.firstPicture || featured.type?.pic_url})` }}
                  />
                ) : (
                  <div
                    className="img-bg absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, rgb(var(--color-1)), rgb(var(--color-4)))`
                    }}
                  />
                )}
                {/* 推荐标签 */}
                <div
                  className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(250,204,21,0.9)', color: '#92400e' }}
                >
                  <Star className="w-3 h-3 fill-current" />
                  推荐
                </div>
              </div>

              {/* 文字内容区 - 完全独立于图片背景 */}
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: 'rgb(var(--color-7) / 0.1)', color: 'rgb(var(--color-7))' }}
                  >
                    {featured.type.name}
                  </span>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-2 leading-tight transition-colors group-hover:text-[rgb(var(--primary))]"
                  style={{ color: 'rgb(var(--text))' }}
                >
                  {featured.title}
                </h3>
                <p className="text-sm line-clamp-2 mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
                  {featured.description}
                </p>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(featured.createTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {featured.views}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* 右侧小卡片 - 水平图文分离布局 */}
        <div className="hidden lg:flex lg:col-span-2 flex-col gap-4 lg:h-full">
          {sideCards.map((blog, index) => (
            <Link
              key={blog.id}
              href={ROUTES.BLOG_DETAIL(blog.id)}
              className="group flex flex-1 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md border animate-slide-up"
              style={{
                animationDelay: `${(index + 1) * 0.1}s`,
                background: 'rgb(var(--card))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              {/* 左侧图片 */}
              <div className="img-zoom-container relative w-[50%] flex-shrink-0 overflow-hidden">
                {blog.firstPicture || blog.type?.pic_url ? (
                  <div
                    className="img-bg absolute inset-0"
                    style={{ backgroundImage: `url(${blog.firstPicture || blog.type?.pic_url})` }}
                  />
                ) : (
                  <div
                    className="img-bg absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, rgb(var(--color-${(index % 4) + 1})), rgb(var(--color-${(index % 4) + 5})))`
                    }}
                  />
                )}
              </div>

              {/* 右侧文字内容 */}
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-medium w-fit mb-2"
                  style={{ background: 'rgb(var(--color-7) / 0.1)', color: 'rgb(var(--color-7))' }}
                >
                  {blog.type.name}
                </span>
                <h4
                  className="text-sm font-semibold line-clamp-2 mb-2 transition-colors group-hover:text-[rgb(var(--primary))]"
                  style={{ color: 'rgb(var(--text))' }}
                >
                  {blog.title}
                </h4>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  <span>{formatDate(blog.createTime)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {blog.views}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}