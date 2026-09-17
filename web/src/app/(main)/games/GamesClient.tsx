'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ExternalLink, Gamepad2, Star } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'

interface Project {
  id: number
  title: string
  content: string
  techs: string
  pic_url: string
  url: string
  type: number
  recommend: boolean
}

interface GamesClientProps {
  initialProjects: Project[]
}

// 单一强调色，按主题适配（浅色加深保证对比度）
function getAccent(theme: string) {
  switch (theme) {
    case 'light':   return { main: '#b8860b', dim: 'rgba(184,134,11,0.12)' }
    case 'macaron': return { main: '#d97706', dim: 'rgba(217,119,6,0.12)' }
    case 'cyber':   return { main: '#fbbf24', dim: 'rgba(251,191,36,0.12)' }
    default:        return { main: '#e8c547', dim: 'rgba(232,197,71,0.10)' }
  }
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } }
}

function GameCard({ project, accent, accentDim }: { project: Project; accent: string; accentDim: string }) {
  const [imgError, setImgError] = useState(false)

  return (
    <motion.div variants={cardVariants} className="group relative h-full">
      <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl h-full flex flex-col">
        {/* 图片 */}
        <div className="relative h-40 overflow-hidden">
          {project.pic_url && !imgError ? (
            <Image
              src={project.pic_url}
              alt={project.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `linear-gradient(135deg, ${accentDim}, transparent)` }}>
              🎮
            </div>
          )}

          {project.recommend && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-bold">推荐</span>
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <h3 className="font-semibold text-base line-clamp-1 text-[rgb(var(--card-foreground))] group-hover:text-[rgb(var(--primary))] transition-colors">
              {project.title}
            </h3>
          </div>

          <p className="text-sm text-[rgb(var(--muted-foreground))] mb-3 line-clamp-2 leading-relaxed" style={{ minHeight: '2.5em' }}>
            {project.content || ' '}
          </p>

          <div className="flex flex-wrap gap-1 mb-3" style={{ minHeight: '1.75rem' }}>
            {project.techs && project.techs.split(',').slice(0, 3).map((tech, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'rgb(var(--border))', color: accent, background: accentDim }}>
                {tech.trim()}
              </span>
            ))}
          </div>

          <Link
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 mt-auto group/btn hover:gap-2"
            style={{ color: accent }}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            开始游戏
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl overflow-hidden">
          <div className="h-40 bg-[rgb(var(--muted))]" />
          <div className="p-4 space-y-2">
            <div className="h-5 bg-[rgb(var(--muted))] rounded w-2/3" />
            <div className="h-3.5 bg-[rgb(var(--muted))] rounded w-full" />
            <div className="h-3.5 bg-[rgb(var(--muted))] rounded w-3/4" />
            <div className="flex gap-1">
              <div className="h-4 bg-[rgb(var(--muted))] rounded w-12" />
              <div className="h-4 bg-[rgb(var(--muted))] rounded w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
      <span className="text-6xl block mb-4">🎮</span>
      <h3 className="text-xl font-bold mb-2 text-[rgb(var(--foreground))]">暂无小游戏</h3>
      <p className="text-[rgb(var(--muted-foreground))]">暂未收录小游戏，请稍后再来~</p>
    </motion.div>
  )
}

export default function GamesClient({ initialProjects }: GamesClientProps) {
  const [showContent, setShowContent] = useState(false)
  const { theme } = useTheme()
  const accent = getAccent(theme)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 400)
    return () => clearTimeout(timer)
  }, [])

  const projects = initialProjects || []

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(232,197,71,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,197,71,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(232,197,71,0.04)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <motion.div
          className="text-center mb-12 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-8 w-8" style={{ color: accent.main }} />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[rgb(var(--foreground))]">
              小游戏
            </h1>
          </div>
        </motion.div>

        {!showContent ? (
          <LoadingSkeleton />
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {projects.map((project) => (
              <GameCard key={project.id} project={project} accent={accent.main} accentDim={accent.dim} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}