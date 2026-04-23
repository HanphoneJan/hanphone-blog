/**
 * 桌面端侧边栏组件 - 杂志风：热门标签 + 精选随笔
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Tag as TagIcon, PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TagSkeletonList } from './TagSkeleton'
import { staggerContainerVariants, skeletonVariants } from '@/components/shared/PageTransition'
import type { Tag, Essay } from '../types'

interface SidebarProps {
  tags: Tag[]
  tagLoading: boolean
  tagVisible: boolean
  onSelectTag: (id: number) => void
  essays: Essay[]
}

const TAG_COLORS = [
  { bg: 'rgb(var(--color-1) / 0.1)', text: 'rgb(var(--color-1))', border: 'rgb(var(--color-1) / 0.2)' },
  { bg: 'rgb(var(--color-2) / 0.1)', text: 'rgb(var(--color-2))', border: 'rgb(var(--color-2) / 0.2)' },
  { bg: 'rgb(var(--color-4) / 0.1)', text: 'rgb(var(--color-4))', border: 'rgb(var(--color-4) / 0.2)' },
  { bg: 'rgb(var(--color-6) / 0.1)', text: 'rgb(var(--color-6))', border: 'rgb(var(--color-6) / 0.2)' },
  { bg: 'rgb(var(--color-5) / 0.1)', text: 'rgb(var(--color-5))', border: 'rgb(var(--color-5) / 0.2)' },
  { bg: 'rgb(var(--color-3) / 0.1)', text: 'rgb(var(--color-3))', border: 'rgb(var(--color-3) / 0.2)' },
  { bg: 'rgb(var(--color-7) / 0.1)', text: 'rgb(var(--color-7))', border: 'rgb(var(--color-7) / 0.2)' },
  { bg: 'rgb(var(--color-8) / 0.1)', text: 'rgb(var(--color-8))', border: 'rgb(var(--color-8) / 0.2)' },
]

export function Sidebar({ tags, tagLoading, tagVisible, onSelectTag, essays }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false)

  // 监听屏幕宽度变化
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleTagMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const tag = e.currentTarget
    const rect = tag.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    tag.style.setProperty('--x', x + '%')
    tag.style.setProperty('--y', y + '%')
  }

  // 格式化时间：今年的不显示年份，往年显示年份
  const formatEssayTime = (createTime: string): string => {
    const date = new Date(createTime)
    const now = new Date()
    const currentYear = now.getFullYear()
    const essayYear = date.getFullYear()
    
    if (essayYear === currentYear) {
      // 今年的只显示月日
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } else {
      // 往年显示年月日
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }

  // 对随笔按时间倒序排序（最新的在前），并根据屏幕尺寸决定显示数量
  const getEssayDisplayCount = () => {
    return isMobile ? 2 : 5
  }

  const sortedEssays = [...essays]
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    .slice(0, getEssayDisplayCount())

  return (
    <div className="space-y-6">
      {/* 热门标签云 - 桌面端显示 */}
      <div className="hidden lg:block bg-[rgb(var(--card))] rounded-xl border p-5" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-4))' }} />
          <h3 className="font-bold text-sm" style={{ color: 'rgb(var(--text))' }}>热门标签</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode='wait'>
            {tagLoading ? (
              <motion.div key='skeleton' variants={skeletonVariants} initial='initial' exit='exit'>
                <TagSkeletonList count={6} />
              </motion.div>
            ) : (
              <motion.div
                key='content'
                className={`flex flex-wrap gap-2 transition-opacity duration-500 ${tagVisible ? 'opacity-100' : 'opacity-0'}`}
                variants={staggerContainerVariants}
                initial='initial'
                animate='animate'
              >
                {tags.slice(0, 10).map((tag, index) => {
                  const colors = TAG_COLORS[index % TAG_COLORS.length]
                  return (
                    <a
                      key={tag.id}
                      onClick={(e) => {
                        e.preventDefault()
                        onSelectTag(tag.id)
                      }}
                      className="tag-pill text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer"
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                      onMouseMove={handleTagMouseMove}
                    >
                      {tag.name}
                      <span className="ml-1 opacity-60">{tag.blogs?.length || 0}</span>
                    </a>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 精选随笔 - 响应式显示 */}
      {sortedEssays.length > 0 && (
        <div className="bg-[rgb(var(--card))] rounded-xl border p-5 lg:p-5" style={{ borderColor: 'rgb(var(--border))' }}>
          <div className="flex items-center gap-2 mb-4">
            <PenLine className="w-4 h-4" style={{ color: 'rgb(var(--color-3))' }} />
            <h3 className="font-bold text-sm" style={{ color: 'rgb(var(--text))' }}>精选随笔</h3>
          </div>
          <div className="space-y-3">
            {sortedEssays.map((essay, idx) => (
              <div key={essay.id} className="essay-card p-3 rounded-lg cursor-pointer" style={{ animationDelay: `${idx * 0.1}s` }}>
                <p className="text-sm line-clamp-2 mb-2" style={{ color: 'rgb(var(--text))' }}>
                  {essay.content}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: `linear-gradient(135deg, rgb(var(--color-${(idx % 3) + 1})), rgb(var(--color-${(idx % 3) + 4})))` }}
                    />
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{essay.nickname}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{formatEssayTime(essay.createTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}