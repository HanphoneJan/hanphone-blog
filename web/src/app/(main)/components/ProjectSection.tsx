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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: '1000px' }}
      >
        {displayProjects.map((project, index) => (
          <a
            key={project.id}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-3d bg-[rgb(var(--card))] rounded-xl border overflow-hidden cursor-pointer group block"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            <div className="relative h-44 overflow-hidden"
            >
              <div className="img-zoom-container relative w-full h-full"
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
                    className="img-bg absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, rgb(var(--color-${(index % 4) + 1}) / 0.3), rgb(var(--color-${(index % 4) + 5}) / 0.2))`
                    }}
                  />
                )}
                <div className="img-zoom-overlay" />
              </div>
              <div className="project-link-icon z-10"
              >
                <ExternalLink className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="p-4"
            >
              <h3
                className="font-bold mb-1.5 group-hover:text-[rgb(var(--primary))] transition-colors"
                style={{ color: 'rgb(var(--text))' }}
              >
                {project.title}
              </h3>
              <p className="text-sm line-clamp-2 mb-3" style={{ color: 'rgb(var(--text-muted))' }}>
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1.5"
              >
                {project.tags?.slice(0, 3).map((tag, tagIndex) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: `${typeColors[tagIndex % typeColors.length]}20`,
                      color: typeColors[tagIndex % typeColors.length]
                    }}
                  >
                    {tag}
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
