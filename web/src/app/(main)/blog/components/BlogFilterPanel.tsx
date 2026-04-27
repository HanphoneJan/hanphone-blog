'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, FolderTree, Tag as TagIcon, Hash, X } from 'lucide-react'
import type { Type, Tag, BlogsByType } from '../types'

interface BlogFilterPanelProps {
  types: Type[]
  blogsByType: BlogsByType
  selectedTypeId: number | null
  tags: Tag[]
  selectedTagId: number | null
  onSelectType: (id: number | null) => void
  onSelectTag: (id: number | null) => void
}

export function BlogFilterPanel({
  types,
  blogsByType,
  selectedTypeId,
  tags,
  selectedTagId,
  onSelectType,
  onSelectTag
}: BlogFilterPanelProps) {
  const [showTypes, setShowTypes] = useState(true)
  const [showTags, setShowTags] = useState(true)

  const handleTypeClick = (typeId: number) => {
    if (selectedTypeId === typeId) {
      onSelectType(null)
    } else {
      onSelectType(typeId)
    }
  }

  const handleTagClick = (tagId: number) => {
    if (selectedTagId === tagId) {
      onSelectTag(null)
    } else {
      onSelectTag(tagId)
    }
  }

  return (
    <div className="space-y-5">
      {/* 分类筛选 */}
      <div>
        <button
          onClick={() => setShowTypes(!showTypes)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] transition-colors"
        >
          <span className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[rgb(var(--orange))]" />
            分类筛选
          </span>
          {showTypes ? (
            <ChevronUp className="h-4 w-4 text-[rgb(var(--text-muted))]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[rgb(var(--text-muted))]" />
          )}
        </button>

        <AnimatePresence>
          {showTypes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="space-y-1">
                {/* 全部 */}
                <button
                  onClick={() => onSelectType(null)}
                  className={`w-full text-left flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-all duration-200 ${
                    selectedTypeId === null
                      ? 'bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] font-medium shadow-sm'
                      : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
                  }`}
                >
                  <span>全部</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      selectedTypeId === null
                        ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]'
                        : 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                    }`}
                  >
                    全部
                  </span>
                </button>

                {/* 分类列表 */}
                {types.map((type) => {
                  const isSelected = selectedTypeId === type.id
                  const count = blogsByType[type.id]?.length ?? 0
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeClick(type.id)}
                      className={`w-full text-left flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-all duration-200 ${
                        isSelected
                          ? 'bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] font-medium shadow-sm'
                          : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))]'
                      }`}
                    >
                      <span className="truncate">{type.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                          isSelected
                            ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]'
                            : 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 标签筛选 */}
      <div>
        <button
          onClick={() => setShowTags(!showTags)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] transition-colors"
        >
          <span className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-[rgb(var(--teal))]" />
            标签筛选
          </span>
          {showTags ? (
            <ChevronUp className="h-4 w-4 text-[rgb(var(--text-muted))]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[rgb(var(--text-muted))]" />
          )}
        </button>

        <AnimatePresence>
          {showTags && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex flex-wrap gap-2">
                {tags
                  .sort((a, b) => (b.blogCount || 0) - (a.blogCount || 0))
                  .map((tag) => {
                    const isSelected = selectedTagId === tag.id
                    return (
                      <motion.button
                        key={tag.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTagClick(tag.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                          isSelected
                            ? 'bg-[rgb(var(--primary)/0.15)] border-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary))] shadow-md'
                            : 'bg-[rgb(var(--muted))] border-[rgb(var(--border)/0.5)] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--primary)/0.08)] hover:border-[rgb(var(--primary)/0.3)] hover:text-[rgb(var(--primary))]'
                        }`}
                      >
                        <Hash className={`w-3 h-3 ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                        <span>{tag.name}</span>
                        {tag.blogCount !== undefined && tag.blogCount > 0 && (
                          <span
                            className={`ml-0.5 text-[10px] ${
                              isSelected ? 'opacity-80' : 'opacity-50'
                            }`}
                          >
                            {tag.blogCount}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
