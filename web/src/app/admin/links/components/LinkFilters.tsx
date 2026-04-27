'use client'

import { Search, Filter, Plus } from 'lucide-react'
import { LINK_TYPES } from '../types'
import type { FilterState } from '../types'

interface LinkFiltersProps {
  filters: FilterState
  totalCount: number
  publishedCount: number
  pendingCount: number
  onFilterChange: (name: keyof FilterState, value: string) => void
  onReset: () => void
  onAddLink: () => void
}

export function LinkFilters({
  filters,
  totalCount,
  publishedCount,
  pendingCount,
  onFilterChange,
  onReset,
  onAddLink
}: LinkFiltersProps) {
  return (
    <div className="md:mb-4 p-3 bg-[rgb(var(--card))]/60 lg:rounded-lg border-[rgb(var(--border))]">
      {/* 第一行：统计 + 筛选器（桌面端全部一行） */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 统计标签 - 紧凑排列 */}
        <div className="flex items-center gap-1.5 mr-1">
          <span className="px-2 py-0.5 bg-[rgb(var(--bg))] rounded text-xs">
            <span className="text-[rgb(var(--muted))]">总计</span>
            <span className="ml-1 font-bold">{totalCount}</span>
          </span>
          <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded text-xs">
            <span className="opacity-70">已发布</span>
            <span className="ml-1 font-bold">{publishedCount}</span>
          </span>
          <span className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded text-xs">
            <span className="opacity-70">待审核</span>
            <span className="ml-1 font-bold">{pendingCount}</span>
          </span>
        </div>

        {/* 类型筛选 */}
        <select
          value={filters.type}
          onChange={e => onFilterChange('type', e.target.value)}
          className="px-2 py-1 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
        >
          <option value="">全部类型</option>
          {LINK_TYPES.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={filters.published}
          onChange={e => onFilterChange('published', e.target.value)}
          className="px-2 py-1 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
        >
          <option value="">全部状态</option>
          <option value="true">已发布</option>
          <option value="false">待审核</option>
        </select>

        {/* 时间排序 */}
        <select
          value={filters.sortOrder}
          onChange={e => onFilterChange('sortOrder', e.target.value)}
          className="px-2 py-1 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
        >
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>

        {/* 搜索框 - 填充剩余空间 */}
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => onFilterChange('searchQuery', e.target.value)}
            placeholder="搜索名称、描述、URL..."
            className="w-full pl-7 pr-3 py-1 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[rgb(var(--muted))]" />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-1.5">
          <button
            onClick={onAddLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[rgb(var(--primary))] text-white text-xs hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">新增</span>
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-xs"
          >
            <Filter className="w-3 h-3" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>
      </div>

    </div>
  )
}
