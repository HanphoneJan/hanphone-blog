'use client'

import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Essay } from '../types'
import { EssayCard } from './EssayCard'

interface EssayListProps {
  essays: Essay[]
  searchKeyword: string
  onSearchChange: (keyword: string) => void
  sortOrder: 'asc' | 'desc' | null
  onToggleSort: () => void
  updateRecommendLoading: number | null
  updatePublishedLoading: number | null
  onToggleRecommend: (essay: Essay) => void
  onTogglePublished: (essay: Essay) => void
  onEdit: (essay: Essay) => void
  onDelete: (id: number) => void
}

export function EssayList({
  essays,
  searchKeyword,
  onSearchChange,
  sortOrder,
  onToggleSort,
  updateRecommendLoading,
  updatePublishedLoading,
  onToggleRecommend,
  onTogglePublished,
  onEdit,
  onDelete
}: EssayListProps) {
  return (
    <div className="px-1 min-h-[90vh]">
      {/* 搜索和排序区域 */}
      <div className="p-4 flex items-center justify-between gap-2 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
          <input
            type="text"
            placeholder="搜索标题..."
            value={searchKeyword}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all min-w-0"
          />
        </div>

        <button
          onClick={onToggleSort}
          className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${
            sortOrder
              ? 'bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))]'
              : 'bg-[rgb(var(--card))]/60 text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
          }`}
          aria-label={
            sortOrder === 'asc'
              ? '当前按时间升序排序，点击切换'
              : sortOrder === 'desc'
              ? '当前按时间降序排序，点击切换'
              : '点击按时间排序'
          }
        >
          {sortOrder === 'asc' ? (
            <ArrowUp className="h-5 w-5" />
          ) : sortOrder === 'desc' ? (
            <ArrowDown className="h-5 w-5" />
          ) : (
            <ArrowUpDown className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        {/* 桌面端表格 */}
        <table className="w-full min-w-[640px] border-collapse hidden md:table">
          <thead>
            <tr className="bg-[rgb(var(--hover))]/60 text-[rgb(var(--text))] text-sm">
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">序号</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">随笔标题</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">文件</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">发布时间</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">发布</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">推荐</th>
              <th className="py-3 px-4 text-left border-b border-[rgb(var(--border))]">操作</th>
            </tr>
          </thead>
          <tbody>
            {essays.length > 0 ? (
              essays.map((item, index) => (
                <EssayCard
                  key={item.id}
                  essay={item}
                  index={index}
                  isMobile={false}
                  updateRecommendLoading={updateRecommendLoading}
                  updatePublishedLoading={updatePublishedLoading}
                  onToggleRecommend={onToggleRecommend}
                  onTogglePublished={onTogglePublished}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[rgb(var(--muted))]">
                  暂无匹配的随笔数据
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 移动端列表视图 */}
        <div className="md:hidden">
          {essays.length > 0 ? (
            <div className="space-y-4">
              {essays.map((item, index) => (
                <EssayCard
                  key={item.id}
                  essay={item}
                  index={index}
                  isMobile={true}
                  updateRecommendLoading={updateRecommendLoading}
                  updatePublishedLoading={updatePublishedLoading}
                  onToggleRecommend={onToggleRecommend}
                  onTogglePublished={onTogglePublished}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-[rgb(var(--muted))]">暂无匹配的随笔数据</div>
          )}
        </div>
      </div>
    </div>
  )
}
