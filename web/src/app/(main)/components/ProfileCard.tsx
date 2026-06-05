'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBilibili, faXTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { Mail } from 'lucide-react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { usePersonalProfile } from '@/hooks/usePersonalProfile'
import type { SiteStats } from '../types'

interface ProfileCardProps {
  stats: SiteStats
  inline?: boolean
}

const PLATFORM_ICONS: Record<string, IconDefinition> = {
  github: faGithub,
  bilibili: faBilibili,
  x: faXTwitter,
  youtube: faYoutube,
}

const PLATFORM_ICON_COLORS: Record<string, string> = {
  bilibili: '#FB7299',
  youtube: '#ef4444',
}

function SocialLinks({ links }: { links: { platform: string; url: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      {links.map(link => {
        const isEmail = link.platform === 'email'
        const isExternal = !isEmail && !link.url.startsWith('/')
        const icon = PLATFORM_ICONS[link.platform]
        const iconColor = PLATFORM_ICON_COLORS[link.platform]

        return (
          <a
            key={link.platform}
            href={link.url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            title={link.label}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgb(var(--hover))' }}
          >
            {isEmail ? (
              <Mail className="w-4 h-4" style={{ color: 'rgb(var(--text-muted))' }} />
            ) : icon ? (
              <FontAwesomeIcon
                icon={icon}
                className="w-4 h-4"
                style={iconColor ? { color: iconColor } : { color: 'rgb(var(--text-muted))' }}
              />
            ) : null}
          </a>
        )
      })}
    </div>
  )
}

export function ProfileCard({ stats, inline = false }: ProfileCardProps) {
  const [visible, setVisible] = useState(inline)
  const { profile, socialLinks } = usePersonalProfile()

  useEffect(() => {
    if (inline) return

    const handleScroll = () => {
      const threshold = window.innerHeight * 0.6
      setVisible(window.scrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [inline])

  const StatsRow = () => (
    <div className="mt-3 flex items-center justify-between gap-2 text-center">
      <div className="flex-1">
        <div className="text-base font-bold stat-number" style={{ color: 'rgb(var(--primary))' }}>{stats.blogCount}</div>
        <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>文章</div>
      </div>
      <div className="w-px h-6" style={{ background: 'rgb(var(--border))' }} />
      <div className="flex-1">
        <div className="text-base font-bold stat-number" style={{ color: 'rgb(var(--color-2))' }}>{stats.essayCount}</div>
        <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>随笔</div>
      </div>
      <div className="w-px h-6" style={{ background: 'rgb(var(--border))' }} />
      <div className="flex-1">
        <div className="text-base font-bold stat-number" style={{ color: 'rgb(var(--color-6))' }}>{stats.projectCount}</div>
        <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>项目</div>
      </div>
      <div className="w-px h-6" style={{ background: 'rgb(var(--border))' }} />
      <div className="flex-1">
        <div className="text-base font-bold stat-number" style={{ color: 'rgb(var(--color-3))' }}>{stats.messageCount}</div>
        <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>留言</div>
      </div>
      <div className="w-px h-6" style={{ background: 'rgb(var(--border))' }} />
      <div className="flex-1">
        <div className="text-base font-bold stat-number" style={{ color: 'rgb(var(--color-5))' }}>{stats.docCount}</div>
        <div className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>文档</div>
      </div>
    </div>
  )

  const CardContent = () => (
    <div className="profile-mini bg-[rgb(var(--card))] rounded-xl border p-5" style={{ borderColor: 'rgb(var(--border))' }}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-offset-2" style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}>
            <Image
              src={profile.avatar || '/avatar.png'}
              alt={profile.name}
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
          <h3 className="font-bold text-base" style={{ color: 'rgb(var(--text))' }}>{profile.name}</h3>
          <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{profile.techDirection?.split('、').slice(0, 2).join(' / ') || '全栈开发者 / AI探索者'}</p>
        </div>
      </div>
      <p className="text-sm mt-3 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
        {profile.description || '热爱技术与创作，记录学习路上的点滴。'}
      </p>
      <StatsRow />
      <SocialLinks links={socialLinks} />
    </div>
  )

  if (inline) {
    return <CardContent />
  }

  return (
    <div
      className={`fixed-profile hidden lg:block transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <CardContent />
    </div>
  )
}
