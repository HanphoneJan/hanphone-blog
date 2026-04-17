/**
 * 分页组件
 */

import { generatePageNumbers } from '../utils'
import type { HomeQueryInfo } from '../types'

interface PaginationProps {
  totalcount: number
  queryInfo: HomeQueryInfo
  isCompact: boolean
  onPageChange: (page: number) => void
  onInputChange: (page: number) => void
}

export function Pagination({
  totalcount,
  queryInfo,
  isCompact,
  onPageChange,
  onInputChange
}: PaginationProps) {
  if (totalcount <= 0) return null

  const totalPages = Math.ceil(totalcount / queryInfo.pagesize)
  const pageNumbers = generatePageNumbers(totalcount, queryInfo)

  return (
    <div className="mt-6 flex justify-center">
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(queryInfo.pagenum - 1)}
          disabled={queryInfo.pagenum === 1}
          className="px-3 py-1 border border-[rgb(var(--border))] rounded bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-50 hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
        >
          上一页
        </button>

        {/* 页码 */}
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={typeof page !== 'number'}
            className={`px-3 py-1 rounded ${
              typeof page === 'number'
                ? queryInfo.pagenum === page
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors'
                : 'cursor-default text-[rgb(var(--text-muted))]'
            }`}
          >
            {page}
          </button>
        ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(queryInfo.pagenum + 1)}
          disabled={queryInfo.pagenum * queryInfo.pagesize >= totalcount}
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
              value={queryInfo.pagenum}
              onChange={(e) => {
                const page = parseInt(e.target.value)
                if (page && page > 0) {
                  onInputChange(page)
                }
              }}
              onKeyPress={(e) =>
                e.key === 'Enter' && onPageChange(queryInfo.pagenum)
              }
              className="w-12 border border-[rgb(var(--border))] rounded px-2 py-1 text-center bg-[rgb(var(--card))] text-[rgb(var(--text))]"
            />
            <span className="mx-2">页</span>
            <button
              onClick={() => onPageChange(queryInfo.pagenum)}
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
