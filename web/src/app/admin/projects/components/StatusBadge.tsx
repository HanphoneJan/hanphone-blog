'use client'

import { Star } from 'lucide-react'
import { getStatusName, getStatusStyle } from '../utils'

interface StatusBadgeProps {
  recommend?: boolean
  loading?: boolean
  onClick?: () => void
  disabled?: boolean
}

export const StatusBadge = ({ recommend, loading, onClick, disabled }: StatusBadgeProps) => {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-4 py-2 rounded transition-colors text-sm flex items-center gap-2 ${
          recommend
            ? 'bg-yellow-100/60 text-yellow-600 hover:bg-yellow-100/80'
            : 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--hover))]'
        }`}
        title={recommend ? '取消推荐' : '推荐项目'}
      >
        {loading ? (
          <span className="animate-spin">...</span>
        ) : (
          <Star className={`h-4 w-4 ${recommend ? 'fill-current' : ''}`} />
        )}
        {getStatusName(recommend)}
      </button>
    )
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(recommend)}`}>
      <Star className={`h-3 w-3 mr-1 ${recommend ? 'fill-current' : ''}`} />
      {getStatusName(recommend)}
    </span>
  )
}

export default StatusBadge
