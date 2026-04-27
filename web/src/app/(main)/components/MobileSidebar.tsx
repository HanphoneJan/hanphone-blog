/**
 * 移动端侧边栏抽屉组件
 */

import { X, ArrowLeft } from 'lucide-react'
import { TypeFilter } from './TypeFilter'
import { TagFilter } from './TagFilter'
import type { Type, Tag } from '../types'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  selected: boolean
  onResetFilters: () => void

  // Type filter props
  types: Type[]
  selectedTypeId: number | null
  typeLoading: boolean
  typeVisible: boolean
  showTypes: boolean
  moreType: boolean
  onToggleShowTypes: () => void
  onSelectType: (id: number) => void
  onToggleMoreType: () => void

  // Tag filter props
  tags: Tag[]
  selectedTagIds: number[]
  tagLoading: boolean
  tagVisible: boolean
  showTags: boolean
  moreTag: boolean
  onToggleShowTags: () => void
  onSelectTag: (id: number) => void
  onToggleMoreTag: () => void
}

export function MobileSidebar({
  isOpen,
  onClose,
  selected,
  onResetFilters,
  types,
  selectedTypeId,
  typeLoading,
  typeVisible,
  showTypes,
  moreType,
  onToggleShowTypes,
  onSelectType,
  onToggleMoreType,
  tags,
  selectedTagIds,
  tagLoading,
  tagVisible,
  showTags,
  moreTag,
  onToggleShowTags,
  onSelectTag,
  onToggleMoreTag
}: MobileSidebarProps) {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/20 opacity-50"
        onClick={onClose}
      ></div>

      {/* 侧边栏内容 */}
      <div className="absolute top-0 left-0 min-h-screen w-4/5 max-w-sm bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] shadow-lg overflow-y-auto">
        <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[rgb(var(--purple))] px-1 flex-1 text-center">
            分类与标签
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 筛选状态重置 */}
        {selected && (
          <div
            onClick={onResetFilters}
            className="p-3 text-center text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] cursor-pointer hover:bg-[rgb(var(--primary)/0.2)] transition-colors"
          >
            <ArrowLeft className="inline-block mr-1 h-4 w-4" />
            清除筛选，显示全部博客
          </div>
        )}

        {/* 分类筛选 */}
        <TypeFilter
          types={types}
          selectedTypeId={selectedTypeId}
          loading={typeLoading}
          visible={typeVisible}
          showTypes={showTypes}
          moreType={moreType}
          onToggleShow={onToggleShowTypes}
          onSelectType={onSelectType}
          onToggleMore={onToggleMoreType}
          isMobile={true}
        />

        {/* 标签筛选 */}
        <TagFilter
          tags={tags}
          selectedTagIds={selectedTagIds}
          loading={tagLoading}
          visible={tagVisible}
          showTags={showTags}
          moreTag={moreTag}
          onToggleShow={onToggleShowTags}
          onSelectTag={onSelectTag}
          onToggleMore={onToggleMoreTag}
          isMobile={true}
        />
      </div>
    </div>
  )
}
