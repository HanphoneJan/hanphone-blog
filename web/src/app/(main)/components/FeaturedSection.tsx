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
        {/* 左侧大图精选 */}
        {featured && (
          <div className="lg:col-span-3 animate-slide-up">
            <Link
              href={ROUTES.BLOG_DETAIL(featured.id)}
              className="group relative rounded-2xl overflow-hidden cursor-pointer block h-[320px] lg:h-[400px]"
            >
              <div className="img-zoom-container relative w-full h-full">
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
                <div className="img-zoom-overlay" />
              </div>
              {/* 内容 */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                <div className="hero-text-reveal">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(250,204,21,0.9)', color: '#92400e' }}
                    >
                      <Star className="w-3 h-3 inline mr-1 fill-current" />
                      推荐
                    </span>
                    <span className="text-xs text-white/70">{featured.type.name}</span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight group-hover:text-blue-200 transition-colors">
                    {featured.title}
                  </h3>
                  <p className="text-white/70 text-sm line-clamp-2 mb-4 max-w-lg">
                    {featured.description}
                  </p>
                  <div className="flex items-center gap-4 text-white/60 text-sm">
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
              </div>
            </Link>
          </div>
        )}

        {/* 右侧小卡片 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {sideCards.map((blog, index) => (
            <Link
              key={blog.id}
              href={ROUTES.BLOG_DETAIL(blog.id)}
              className="group relative rounded-xl overflow-hidden cursor-pointer flex-1 min-h-[120px] block animate-slide-up"
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="img-zoom-container relative w-full h-full">
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
                <div className="img-zoom-overlay" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
                <span className="text-xs text-white/60 mb-1">{blog.type.name}</span>
                <h4 className="text-base font-semibold text-white line-clamp-2 group-hover:text-blue-200 transition-colors">
                  {blog.title}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-white/50 text-xs">
                  <span>{formatDate(blog.createTime)}</span>
                  <span>{blog.views} 阅读</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
