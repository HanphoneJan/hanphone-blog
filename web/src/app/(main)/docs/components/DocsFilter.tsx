'use client'

import { Search, X } from 'lucide-react'

interface DocsFilterProps {
  searchQuery: string
  onSearchChange: (v: string) => void
  selectedType: string
  onTypeChange: (v: string) => void
  typeStats: Record<string, number>
  totalCount: number
}

const typePills = [
  { value: 'all', label: '全部' },
  { value: 'docx', label: 'Word' },
  { value: 'pdf', label: 'PDF' },
  { value: 'md', label: 'MD' },
  { value: 'html', label: 'HTML' },
]

export default function DocsFilter({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  typeStats,
  totalCount,
}: DocsFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 搜索框 */}
      <div className="flex-1 min-w-[160px] relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))/0.5]" />
        <input
          type="text"
          placeholder="搜索文档…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 bg-[rgb(var(--hover))] border border-transparent rounded-md text-[13px] text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))/0.4] focus:outline-none focus:border-[rgb(var(--border))] focus:bg-[rgb(var(--card))] transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[rgb(var(--border))] transition-colors"
          >
            <X className="w-3 h-3 text-[rgb(var(--text-muted))]" />
          </button>
        )}
      </div>

      {/* 类型筛选 pill */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {typePills.map((t) => {
          const count = t.value === 'all' ? totalCount : typeStats[t.value] || 0
          const active = selectedType === t.value
          return (
            <button
              key={t.value}
              onClick={() => onTypeChange(t.value)}
              className={`px-2 py-1 rounded text-[12px] whitespace-nowrap transition-all ${
                active
                  ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] font-medium'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              {t.label}
              <span className="ml-0.5 opacity-50">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
