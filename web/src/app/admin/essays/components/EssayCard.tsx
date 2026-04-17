'use client'

import { Edit3, Trash2, Star, StarOff, Loader2, FileImage, FileVideo, FileText } from 'lucide-react'
import type { Essay } from '../types'
import { formatDate, countFilesByType, getFileName } from '../utils'

interface EssayCardProps {
  essay: Essay
  index: number
  isMobile: boolean
  updateRecommendLoading: number | null
  onToggleRecommend: (essay: Essay) => void
  onEdit: (essay: Essay) => void
  onDelete: (id: number) => void
}

export function EssayCard({
  essay,
  index,
  isMobile,
  updateRecommendLoading,
  onToggleRecommend,
  onEdit,
  onDelete
}: EssayCardProps) {
  const fileCounts = countFilesByType(essay.essayFileUrls || [])
  const totalFiles = fileCounts.images + fileCounts.videos + fileCounts.texts

  // 渲染文件统计
  const renderFileStats = () => (
    <>
      {fileCounts.images > 0 && (
        <span className="flex items-center mr-2">
          <FileImage className="h-3.5 w-3.5 mr-1 text-blue-500" />
          图片: {fileCounts.images}
        </span>
      )}
      {fileCounts.videos > 0 && (
        <span className="flex items-center mr-2">
          <FileVideo className="h-3.5 w-3.5 mr-1 text-green-500" />
          视频: {fileCounts.videos}
        </span>
      )}
      {fileCounts.texts > 0 && (
        <span className="flex items-center">
          <FileText className="h-3.5 w-3.5 mr-1 text-yellow-500" />
          文档: {fileCounts.texts}
        </span>
      )}
    </>
  )

  // 渲染操作按钮
  const renderActions = () => (
    <>
      <button
        onClick={() => onToggleRecommend(essay)}
        disabled={updateRecommendLoading === essay.id}
        className={`p-1.5 rounded-full transition-colors ${
          essay.recommend
            ? 'bg-yellow-100/60 text-yellow-600 hover:bg-yellow-100/80'
            : 'bg-[rgb(var(--hover))]/60 text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))]/80'
        }`}
        title={essay.recommend ? '取消推荐' : '推荐'}
      >
        {updateRecommendLoading === essay.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : essay.recommend ? (
          <Star className="h-4 w-4 fill-yellow-500" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={() => onEdit(essay)}
        className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors"
        title="编辑"
      >
        <Edit3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(essay.id as number)}
        className="p-1.5 rounded-full bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors"
        title="删除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  )

  if (isMobile) {
    return (
      <div className="bg-[rgb(var(--card))]/60 rounded-lg overflow-hidden border-[rgb(var(--border))]/30">
        {/* 标题栏 */}
        <div className="bg-[rgb(var(--hover))]/60 px-4 py-3 border-b border-[rgb(var(--border))] flex justify-between items-center">
          <span className="text-sm text-[rgb(var(--muted))]">序号: {index + 1}</span>
          <div className="flex gap-2">
            {renderActions()}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-3">
          <div>
            <span className="block text-xs text-[rgb(var(--muted))] mb-1">随笔标题</span>
            <span className="text-[rgb(var(--text))]">{essay.title}</span>
          </div>

          <div>
            <span className="block text-xs text-[rgb(var(--muted))] mb-1">文件</span>
            {totalFiles > 0 ? (
              <div className="flex flex-wrap gap-2 text-sm text-[rgb(var(--text))]">
                {renderFileStats()}
              </div>
            ) : (
              <span className="text-[rgb(var(--muted))] text-sm">无文件</span>
            )}
          </div>

          <div>
            <span className="block text-xs text-[rgb(var(--muted))] mb-1">发布时间</span>
            <span className="text-[rgb(var(--muted))] text-sm">
              {formatDate(essay.createTime)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 桌面端表格行
  return (
    <tr className="hover:bg-[rgb(var(--hover))]/60 transition-colors">
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30 text-[rgb(var(--text))]">
        {index + 1}
      </td>
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30 text-[rgb(var(--text))] max-w-xs truncate">
        {essay.title}
      </td>
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30">
        {totalFiles > 0 ? (
          <div className="flex items-center text-sm text-[rgb(var(--text))]">
            {renderFileStats()}
          </div>
        ) : (
          <span className="text-[rgb(var(--muted))] text-sm">无文件</span>
        )}
      </td>
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30 text-[rgb(var(--muted))] text-sm">
        {formatDate(essay.createTime)}
      </td>
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30">
        <button
          onClick={() => onToggleRecommend(essay)}
          disabled={updateRecommendLoading === essay.id}
          className={`p-1.5 rounded-full transition-colors ${
            essay.recommend
              ? 'bg-yellow-100/60 text-yellow-600 hover:bg-yellow-100/80'
              : 'bg-[rgb(var(--hover))]/60 text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))]/80'
          }`}
          title={essay.recommend ? '取消推荐' : '推荐'}
        >
          {updateRecommendLoading === essay.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : essay.recommend ? (
            <Star className="h-4 w-4 fill-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </button>
      </td>
      <td className="py-3 px-4 border-b border-[rgb(var(--border))]/30">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(essay)}
            className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors"
            title="编辑"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(essay.id as number)}
            className="p-1.5 rounded-full bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
