'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Folder, FolderOpen, BookOpen, FileText } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { BLOG_LABELS } from '@/lib/labels'
import type { Type, BlogsByType } from '../types'

interface BlogCategoryTreeProps {
  types: Type[]
  blogsByType: BlogsByType
  selectedTypeId: number | null
  expandedTypes: Set<number>
  onToggleExpand: (typeId: number) => void
  onSelectType: (typeId: number | null) => void
}

const folderContentVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.25, ease: 'easeOut' as const },
      opacity: { duration: 0.2, delay: 0.05 }
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: 'easeIn' as const },
      opacity: { duration: 0.1 }
    }
  }
}

export function BlogCategoryTree({
  types,
  blogsByType,
  selectedTypeId,
  expandedTypes,
  onToggleExpand,
  onSelectType
}: BlogCategoryTreeProps) {
  return (
    <div className="space-y-1">
      {/* 标题 */}
      <h3 className="blog-text-lg font-semibold text-[rgb(var(--text))] flex items-center gap-2 mb-4 px-1">
        <BookOpen className="h-5 w-5 text-[rgb(var(--primary))]" />
        {BLOG_LABELS.NAV_TITLE}
      </h3>

      {/* 全部 */}
      <button
        onClick={() => onSelectType(null)}
        className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded-lg transition-colors blog-text-base mb-1 ${
          selectedTypeId === null
            ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] font-medium'
            : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
        }`}
      >
        <FolderOpen className="w-4 h-4 shrink-0" />
        <span className="truncate">{BLOG_LABELS.ALL_CATEGORIES}</span>
      </button>

      {/* 分类列表 */}
      {types.map((type) => {
        const isExpanded = expandedTypes.has(type.id)
        const isActive = selectedTypeId === type.id
        const subBlogs = blogsByType[type.id] || []
        const hasChildren = subBlogs.length > 0

        return (
          <div key={type.id}>
            {/* 分类行 */}
            <div
              className={`flex items-center rounded-lg transition-colors ${
                isActive
                  ? 'bg-[rgb(var(--primary)/0.1)]'
                  : 'hover:bg-[rgb(var(--hover))]'
              }`}
            >
              {/* 展开/折叠按钮 */}
              {hasChildren ? (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExpand(type.id)
                  }}
                  className="flex items-center justify-center w-6 h-8 shrink-0 rounded-sm hover:bg-[rgb(var(--border)/0.3)] transition-colors"
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
                </motion.button>
              ) : (
                <span className="w-6 h-8 shrink-0" />
              )}

              {/* 分类名称 */}
              <button
                onClick={() => onSelectType(type.id)}
                className={`flex items-center gap-2 flex-1 min-w-0 py-2 pl-1 pr-2 rounded-r-lg text-sm transition-colors text-left ${
                  isActive
                    ? 'text-[rgb(var(--primary))] font-medium'
                    : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isExpanded ? (
                    <motion.div
                      key="open"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <FolderOpen
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))]'
                        }`}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Folder
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[rgb(var(--primary))]' : 'text-[rgb(var(--text-muted))]'
                        }`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="truncate">{type.name}</span>
                {subBlogs.length > 0 && (
                  <span className="ml-auto text-xs text-[rgb(var(--text-muted))/0.6] tabular-nums shrink-0">
                    {subBlogs.length}
                  </span>
                )}
              </button>
            </div>

            {/* 子文章列表 */}
            <AnimatePresence>
              {isExpanded && subBlogs.length > 0 && (
                <motion.div
                  variants={folderContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pl-6 border-l border-[rgb(var(--border)/0.4)] ml-3 space-y-0.5 py-1">
                    {subBlogs.map((blog, index) => (
                      <motion.div
                        key={blog.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                      >
                        <Link
                          href={ROUTES.BLOG_DETAIL(blog.id)}
                          className="flex items-center gap-1.5 py-1.5 px-2 rounded text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:bg-[rgb(var(--hover))] transition-colors truncate"
                          title={blog.title}
                        >
                          <FileText className="w-3 h-3 shrink-0 opacity-60" />
                          <span className="truncate">{blog.title}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
