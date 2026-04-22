/**
 * 分页组件
 */

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
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-50 hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
        >
          上一页
        </button>

        {/* 页码 */}
        {pageNumbers.map((pageNum, index) => (
          <button
            key={index}
            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
            disabled={typeof pageNum !== 'number'}
            className={`px-3 py-1 rounded ${
              typeof pageNum === 'number'
                ? page === pageNum
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors'
                : 'cursor-default text-[rgb(var(--text-muted))]'
            }`}
          >
            {pageNum}
          </button>
        ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page * size >= totalcount}
          className="px-3 py-1 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-50 hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
        >
          下一页
        </button>

        {/* 跳转到 */}
        {!isCompact && (
          <div className="ml-4 flex items-center text-sm text-[rgb(var(--text-muted))]">
            <span className="mr-2">跳至</span>
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
              onKeyPress={(e) =>
                e.key === 'Enter' && onPageChange(page)
              }
              className="w-12 border border-[rgb(var(--border))] rounded px-2 py-1 text-center bg-[rgb(var(--card))] text-[rgb(var(--text))]"
            />
            <span className="mx-2">页</span>
            <button
              onClick={() => onPageChange(page)}
              className="px-2 py-1 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
            >
              确定
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
