/**
 * 分页组件
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { generatePageNumbers } from '../utils'
import type { HomeQueryInfo } from '../types'

interface PaginationProps {
  totalcount: number
  queryInfo?: HomeQueryInfo
  currentPage?: number
  pageSize?: number
  isCompact: boolean
  onPageChange: (page: number) => void
  onInputChange: (page: number) => void
}

export function Pagination({
  totalcount,
  queryInfo,
  currentPage,
  pageSize,
  isCompact,
  onPageChange,
  onInputChange
}: PaginationProps) {
  if (totalcount <= 0) return null

  // 支持两种参数方式
  const page = queryInfo?.pagenum ?? currentPage ?? 1
  const size = queryInfo?.pagesize ?? pageSize ?? 10

  const totalPages = Math.ceil(totalcount / size)

  // 为 Blog 页面创建临时的 queryInfo 对象
  const effectiveQueryInfo = queryInfo || {
    query: '',
    pagenum: page,
    pagesize: size
  }

  const pageNumbers = generatePageNumbers(totalcount, effectiveQueryInfo)

  return (
    <div className="mt-6 flex justify-center">
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* 上一页 - 使用图标按钮 */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-sm sm:text-base"
          aria-label="上一页"
          title="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">上一页</span>
        </button>

        {/* 页码 - 移动端简化显示 */}
        {pageNumbers.map((pageNum, index) => (
          <button
            key={index}
            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
            disabled={typeof pageNum !== 'number'}
            className={`min-w-[2rem] sm:min-w-[2.5rem] px-1.5 sm:px-3 py-1.5 sm:py-2 rounded text-sm sm:text-base ${
              typeof pageNum === 'number'
                ? page === pageNum
                  ? 'bg-[rgb(var(--primary))] text-white font-medium'
                  : 'border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors'
                : 'cursor-default text-[rgb(var(--text-muted))] px-1'
            }`}
          >
            {pageNum}
          </button>
        ))}

        {/* 下一页 - 使用图标按钮 */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-sm sm:text-base"
          aria-label="下一页"
          title="下一页"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* 跳转到 - 仅非紧凑模式下显示 */}
        {!isCompact && (
          <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2 text-sm text-[rgb(var(--text-muted))] whitespace-nowrap">
            <span className="shrink-0">跳至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={page}
              onChange={(e) => {
                const newPage = parseInt(e.target.value)
                if (newPage && newPage > 0) {
                  onInputChange(newPage)
                }
              }}
              onKeyDown={(e) =>
                e.key === 'Enter' && onPageChange(page)
              }
              className="w-10 sm:w-12 shrink-0 border border-[rgb(var(--border))] rounded px-1 sm:px-2 py-1 text-center bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm sm:text-base"
            />
            <span className="shrink-0">页</span>
            <button
              onClick={() => onPageChange(page)}
              className="shrink-0 px-2 sm:px-3 py-1 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-sm sm:text-base"
            >
              确定
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
