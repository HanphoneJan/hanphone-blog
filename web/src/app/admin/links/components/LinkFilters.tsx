'use client'

import { Search, Filter } from 'lucide-react'
import { LINK_TYPES } from '../types'
import type { FilterState } from '../types'

interface LinkFiltersProps {
  filters: FilterState
  totalCount: number
  filteredCount: number
  publishedCount: number
  pendingCount: number
  onFilterChange: (name: keyof FilterState, value: string) => void
  onReset: () => void
}

export function LinkFilters({
  filters,
  totalCount,
  filteredCount,
  publishedCount,
  pendingCount,
  onFilterChange,
  onReset
}: LinkFiltersProps) {
  return (
    <div className="md:mb-4 p-3 bg-[rgb(var(--card))]/60 lg:rounded-lg border-[rgb(var(--border))]">
      {/* 统计信息 */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-[rgb(var(--border))]">
        <div className="px-3 py-1 bg-[rgb(var(--bg))] rounded-md text-xs">
          <span className="text-[rgb(var(--muted))]">总计:</span>
          <span className="ml-1 font-bold">{totalCount}</span>
        </div>
        <div className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-md text-xs">
          <span className="opacity-70">已发布:</span>
          <span className="ml-1 font-bold">{publishedCount}</span>
        </div>
        <div className="px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-md text-xs">
          <span className="opacity-70">待审核:</span>
          <span className="ml-1 font-bold">{pendingCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 类型筛选 */}
        <div className="space-y-1">
          <label className="block text-xs text-[rgb(var(--muted))]">友链类型</label>
          <select
            value={filters.type}
            onChange={e => onFilterChange('type', e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
          >
            <option value="">全部类型</option>
            {LINK_TYPES.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* 发布状态筛选 */}
        <div className="space-y-1">
          <label className="block text-xs text-[rgb(var(--muted))]">审核状态</label>
          <select
            value={filters.published}
            onChange={e => onFilterChange('published', e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
          >
            <option value="">全部状态</option>
            <option value="true">已发布</option>
            <option value="false">待审核</option>
          </select>
        </div>

        {/* 名称搜索 */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-[rgb(var(--muted))]">搜索</label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={e => onFilterChange('searchQuery', e.target.value)}
              placeholder="搜索名称、描述、URL、昵称..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="text-xs text-[rgb(var(--muted))]">
          显示 {filteredCount} 个友链
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
        >
          <Filter className="w-3 h-3" />
          重置筛选
        </button>
      </div>
    </div>
  )
}
