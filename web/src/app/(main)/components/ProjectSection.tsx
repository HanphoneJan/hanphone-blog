'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import type { Project } from '../types'

interface ProjectSectionProps {
  projects: Project[]
}

export function ProjectSection({ projects }: ProjectSectionProps) {
  if (!projects || projects.length === 0) return null

  const displayProjects = projects.slice(0, 3)

  const typeColors = [
    'rgb(var(--color-1))',
    'rgb(var(--color-2))',
    'rgb(var(--color-4))',
    'rgb(var(--color-6))',
    'rgb(var(--color-3))',
    'rgb(var(--color-5))',
  ]

  return (
    <section className="py-8 content-fade-in"
    >
      <div className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-2"
        >
          <div
            className="w-1 h-5 rounded-full"
            style={{ background: 'linear-gradient(to bottom, rgb(var(--color-6)), rgb(var(--color-3)))' }}
          />
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--text))' }}>项目作品</h2>
        </div>
        <Link
          href={ROUTES.HOME + 'projects'}
          className="text-sm flex items-center gap-1 transition-colors hover:text-[rgb(var(--primary))]"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          查看全部
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {displayProjects.map((project, index) => (
          <a
            key={project.id}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-[rgb(var(--primary)/0.1)] hover:-translate-y-1 block"
          >
            <div className="relative h-48 overflow-hidden"
            >
              <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-110"
              >
                {project.pic_url ? (
                  <Image
                    src={project.pic_url}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, rgb(var(--color-${(index % 4) + 1}) / 0.3), rgb(var(--color-${(index % 4) + 5}) / 0.2))`
                    }}
                  />
                )}
                {/* 遮罩层 */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              </div>

              {/* 悬浮图标 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
              >
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-2xl">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            <div className="p-5"
            >
              <h3
                className="text-base font-bold mb-2 group-hover:text-[rgb(var(--primary))] transition-colors line-clamp-1"
                style={{ color: 'rgb(var(--text))' }}
              >
                {project.title}
              </h3>
              <p className="text-sm line-clamp-2 mb-4 leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>
                {project.content}
              </p>
              <div className="flex flex-wrap gap-2"
              >
                {project.techs?.split(',').slice(0, 3).map((tech, techIndex) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold"
                    style={{
                      background: `${typeColors[techIndex % typeColors.length]}15`,
                      color: typeColors[techIndex % typeColors.length],
                      border: `1px solid ${typeColors[techIndex % typeColors.length]}30`
                    }}
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
