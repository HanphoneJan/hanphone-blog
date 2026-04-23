'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBilibili } from '@fortawesome/free-brands-svg-icons'
import { FOOTER_CONFIG } from '@/lib/constants'
import type { SiteStats } from '../types'

interface ProfileCardProps {
  stats: SiteStats
  inline?: boolean
}

export function ProfileCard({ stats, inline = false }: ProfileCardProps) {
  const [visible, setVisible] = useState(inline)

  useEffect(() => {
    if (inline) return

    const handleScroll = () => {
      // hero区高度约为100vh，滚动超过60vh后显示
      const threshold = window.innerHeight * 0.6
      setVisible(window.scrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // 初始检查

    return () => window.removeEventListener('scroll', handleScroll)
  }, [inline])

  if (inline) {
    return (
      <div className="profile-mini bg-[rgb(var(--card))] rounded-xl border p-5" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-offset-2" style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}>
              <Image
                src="/avatar.png"
                alt="寒枫"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" style={{ background: 'rgb(var(--color-2))' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base" style={{ color: 'rgb(var(--text))' }}>寒枫</h3>
            <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>全栈开发者 / AI探索者</p>
          </div>
        </div>
        <p className="text-sm mt-3 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
          热爱技术与创作，记录学习路上的点滴。关注Agent开发、前端工程化和机器学习应用。
        </p>
        {/* 统计 */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgb(var(--border))' }}>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--primary))' }}>{stats.blogCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>文章</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--color-2))' }}>{stats.essayCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>随笔</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--color-6))' }}>{stats.projectCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>项目</div>
          </div>
        </div>
        {/* 社交链接 */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <a href={FOOTER_CONFIG.GITHUB} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <FontAwesomeIcon icon={faGithub} className="w-4 h-4" style={{ color: 'rgb(var(--text-muted))' }} />
          </a>
          <a href={FOOTER_CONFIG.BILIBILI} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <FontAwesomeIcon icon={faBilibili} className="w-4 h-4" style={{ color: '#FB7299' }} />
          </a>
          <a href={`mailto:${FOOTER_CONFIG.EMAIL}`} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(var(--text-muted))' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed-profile hidden lg:block transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="profile-mini bg-[rgb(var(--card))] rounded-xl border p-5" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-offset-2" style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}>
              <Image
                src="/avatar.png"
                alt="寒枫"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" style={{ background: 'rgb(var(--color-2))' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base" style={{ color: 'rgb(var(--text))' }}>寒枫</h3>
            <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>全栈开发者 / AI探索者</p>
          </div>
        </div>
        <p className="text-sm mt-3 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
          热爱技术与创作，记录学习路上的点滴。关注Agent开发、前端工程化和机器学习应用。
        </p>
        {/* 统计 */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgb(var(--border))' }}>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--primary))' }}>{stats.blogCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>文章</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--color-2))' }}>{stats.essayCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>随笔</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold stat-number" style={{ color: 'rgb(var(--color-6))' }}>{stats.projectCount}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>项目</div>
          </div>
        </div>
        {/* 社交链接 */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <a href={FOOTER_CONFIG.GITHUB} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <FontAwesomeIcon icon={faGithub} className="w-4 h-4" style={{ color: 'rgb(var(--text-muted))' }} />
          </a>
          <a href={FOOTER_CONFIG.BILIBILI} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <FontAwesomeIcon icon={faBilibili} className="w-4 h-4" style={{ color: '#FB7299' }} />
          </a>
          <a href={`mailto:${FOOTER_CONFIG.EMAIL}`} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgb(var(--hover))' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(var(--text-muted))' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
