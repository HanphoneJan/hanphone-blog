'use client'

import { Search, X, Loader2, ChevronDown } from 'lucide-react'
import type { Type } from '../types'

interface BlogFiltersProps {
  queryTitle: string
  selectedType: string
  typeList: Type[]
  loading: boolean
  onSearchChange: (value: string) => void
  onTypeSelect: (typeName: string) => void
  onClear: () => void
  onSearch: () => void
}

export function BlogFilters({
  queryTitle,
  selectedType,
  typeList,
  loading,
  onSearchChange,
  onTypeSelect,
  onClear,
  onSearch
}: BlogFiltersProps) {
  return (
    <div className="bg-[rgb(var(--card)/0.8)] backdrop-blur-sm border-[rgb(var(--border))] lg:rounded-t-xl px-4 py-3 border shadow-sm dark:bg-[rgb(var(--card)/0.6)] dark:border-[rgb(var(--border))]">
      {/* 大屏幕：搜索框、分类、按钮在同一行 */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))]" />
            <input
              type="text"
              placeholder="搜索标题..."
              value={queryTitle}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--card)/0.6)] border-[rgb(var(--border))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all dark:bg-[rgb(var(--bg)/0.6)] dark:border-[rgb(var(--border))] dark:focus:ring-[rgb(var(--primary))]"
            />
          </div>
        </div>

        <div className="w-48 relative">
          <select
            value={selectedType}
            onChange={e => onTypeSelect(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--card)/0.6)] border-[rgb(var(--border))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all appearance-none dark:bg-[rgb(var(--bg)/0.6)] dark:border-[rgb(var(--border))] dark:focus:ring-[rgb(var(--primary))]"
          >
            <option value="">所有分类</option>
            {typeList.map(item => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))] pointer-events-none" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-4 py-2.5 rounded-lg bg-[rgb(var(--muted)/0.6)] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] transition-all flex items-center justify-center gap-2 dark:bg-[rgb(var(--muted)/0.4)] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]"
          >
            <X className="h-4 w-4" />
            清除
          </button>
          <button
            onClick={onSearch}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white transition-all flex items-center justify-center gap-2 dark:bg-[rgb(var(--primary))] dark:hover:bg-[rgb(var(--primary-hover))]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                搜索中...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                搜索
              </>
            )}
          </button>
        </div>
      </div>

      {/* 小屏幕：搜索框一行，分类与按钮一行 */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))]" />
            <input
              type="text"
              placeholder="搜索标题..."
              value={queryTitle}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--card)/0.6)] border-[rgb(var(--border))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all dark:bg-[rgb(var(--bg)/0.6)] dark:border-[rgb(var(--border))] dark:focus:ring-[rgb(var(--primary))]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative min-w-[120px]">
            <select
              value={selectedType}
              onChange={e => onTypeSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[rgb(var(--card)/0.6)] border-[rgb(var(--border))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all appearance-none text-sm dark:bg-[rgb(var(--bg)/0.6)] dark:border-[rgb(var(--border))] dark:focus:ring-[rgb(var(--primary))]"
            >
              <option value="">所有分类</option>
              {typeList.map(item => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))] pointer-events-none" />
          </div>

          <button
            onClick={onClear}
            className="px-3 py-2.5 rounded-lg bg-[rgb(var(--muted)/0.6)] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] transition-all flex items-center justify-center gap-1 min-w-[80px] dark:bg-[rgb(var(--muted)/0.4)] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">清除</span>
          </button>

          <button
            onClick={onSearch}
            disabled={loading}
            className="px-3 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white transition-all flex items-center justify-center gap-1 min-w-[80px] dark:bg-[rgb(var(--primary))] dark:hover:bg-[rgb(var(--primary-hover))]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span className="text-sm">搜索</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
