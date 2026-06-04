/**
 * 标签筛选组件
 */

import { ChevronDown, ChevronUp, Tag as TagIcon } from 'lucide-react'
import { TagSkeletonList } from './TagSkeleton'
import type { Tag } from '../types'

interface TagFilterProps {
  tags: Tag[]
  selectedTagIds: number[]
  loading: boolean
  visible: boolean
  showTags: boolean
  moreTag: boolean
  onToggleShow: () => void
  onSelectTag: (id: number) => void
  onToggleMore: () => void
  isMobile?: boolean
}

export function TagFilter({
  tags,
  selectedTagIds,
  loading,
  visible,
  showTags,
  moreTag,
  onToggleShow,
  onSelectTag,
  onToggleMore,
  isMobile = false
}: TagFilterProps) {
  const buttonClass = isMobile
    ? 'w-full flex justify-between items-center font-medium mb-3 text-[rgb(var(--teal))] hover:bg-[rgb(var(--teal)/0.1)] px-2 py-1.5 rounded-lg transition-all'
    : 'w-full flex justify-between items-center font-medium mb-3 text-[rgb(var(--teal))]'

  const containerClass = isMobile
    ? 'flex flex-wrap gap-2 min-h-[30vh] overflow-y-auto pr-2'
    : 'flex flex-wrap gap-2 mb-2'

  const tagClass = (isSelected: boolean) =>
    isMobile
      ? `inline-flex items-center px-2 py-1 m-1 rounded-full text-sm border transition-colors ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] border-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary))] shadow-md'
            : 'bg-[rgb(var(--muted))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--primary)/0.08)] hover:border-[rgb(var(--primary)/0.2)]'
        }`
      : `inline-flex items-center px-2.5 py-1.5 m-1 rounded-full text-xs font-medium border transition-all duration-300 hover:scale-105 ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] border-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary))] shadow-md'
            : 'bg-[rgb(var(--muted))] border-[rgb(var(--border)/0.5)] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--primary)/0.08)] hover:border-[rgb(var(--primary)/0.3)] hover:shadow-sm'
        }`

  const countClass = (isSelected: boolean) =>
    isMobile
      ? `ml-1 text-xs rounded-full px-1.5 ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]'
            : 'bg-[rgb(var(--muted)/0.7)]'
        }`
      : `ml-1.5 text-xs rounded-full px-1.5 ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]'
            : 'bg-[rgb(var(--muted)/0.8)] text-[rgb(var(--text-muted))]'
        }`

  return (
    <div className={isMobile ? 'p-4 pt-0' : ''}>
      <button onClick={onToggleShow} className={buttonClass}>
        <span>标签</span>
        {showTags ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {showTags && (
        <div className={containerClass}>
          {loading ? (
            <TagSkeletonList count={10} />
          ) : (
            <div
              className={`transition-all duration-500 ${
                visible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id)
                return (
                  <span
                    key={tag.id}
                    onClick={() => onSelectTag(tag.id)}
                    className={tagClass(isSelected)}
                  >
                    <TagIcon className={isMobile ? 'mr-1 h-3 w-3' : 'mr-1.5 h-3 w-3'} />
                    {tag.name}
                    <span className={countClass(isSelected)}>{tag.blogs.length}</span>
                  </span>
                )
              })}
            </div>
          )}
          <div
            onClick={onToggleMore}
            className={
              isMobile
                ? 'w-full text-center text-sm text-[rgb(var(--primary))] cursor-pointer hover:bg-[rgb(var(--primary)/0.05)] rounded mt-1 p-1'
                : 'w-full text-center text-sm text-[rgb(var(--teal))] cursor-pointer hover:bg-[rgb(var(--teal)/0.1)] rounded-lg transition-all duration-300 hover:scale-105 mt-2 p-2 font-medium'
            }
          >
            {moreTag ? (
              <>
                查看更多 <ChevronDown className="inline-block ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                收起 <ChevronUp className="inline-block ml-1 h-4 w-4" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
