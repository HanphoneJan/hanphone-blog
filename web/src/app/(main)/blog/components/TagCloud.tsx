'use client'

import { motion } from 'framer-motion'
import { Tag, Hash } from 'lucide-react'

interface TagItem {
  id: number
  name: string
  blogCount?: number
}

interface TagCloudProps {
  tags: TagItem[]
  maxDisplay?: number
  selectedTagId?: number | null
  onTagClick?: (tagId: number | null) => void
}

export function TagCloud({ tags, maxDisplay = 15, selectedTagId, onTagClick }: TagCloudProps) {
  // 按文章数量排序，取前 maxDisplay 个
  const displayTags = tags
    .sort((a, b) => (b.blogCount || 0) - (a.blogCount || 0))
    .slice(0, maxDisplay)

  if (displayTags.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold text-[rgb(var(--text))] mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-[rgb(var(--primary))]" />
        热门标签
      </h4>
      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag, index) => {
          const isSelected = selectedTagId === tag.id
          return (
            <motion.button
              key={tag.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              onClick={() => onTagClick?.(isSelected ? null : tag.id)}
              className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-200 ${
                isSelected
                  ? 'bg-[rgb(var(--primary))] text-white shadow-md'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--primary)/0.1)] hover:text-[rgb(var(--primary))]'
              }`}
            >
              <Hash className={`w-3 h-3 ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
              <span>{tag.name}</span>
              {tag.blogCount !== undefined && tag.blogCount > 0 && (
                <span className={`ml-0.5 text-[10px] ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                  {tag.blogCount}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
