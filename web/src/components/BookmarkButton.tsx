'use client'

import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useBookmarks } from '@/contexts/BookmarkContext'
import { useUser } from '@/contexts/UserContext'
import type { BookmarkType } from '@/lib/api'

interface BookmarkButtonProps {
  type: BookmarkType
  /** BLOG / ESSAY 传数值 ID，DOC 传 docId */
  contentKey: string | number | null | undefined
  /** 是否显示「收藏 / 已收藏」文字，默认只显示图标 */
  showLabel?: boolean
  /** 追加布局类（颜色与禁用态由组件内部控制） */
  className?: string
  iconClassName?: string
}

/**
 * 通用收藏按钮：只读 BookmarkContext。
 * - 未登录点击 → 打开现有登录弹窗
 * - 已登录 → 乐观更新的 toggle，请求中禁用
 */
export default function BookmarkButton({
  type,
  contentKey,
  showLabel = false,
  className = '',
  iconClassName = 'w-4 h-4'
}: BookmarkButtonProps) {
  const { userInfo, onShowLogin } = useUser()
  const { isBookmarked, isPending, toggle } = useBookmarks()

  const key = contentKey === null || contentKey === undefined ? '' : String(contentKey).trim()
  if (!key) return null

  const active = isBookmarked(type, key)
  const pending = isPending(type, key)
  const label = active ? '取消收藏' : '收藏'
  const Icon = active ? BookmarkCheck : Bookmark

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // 卡片 / 列表行整块可点击时，收藏按钮只处理自己
    event.preventDefault()
    event.stopPropagation()
    if (!userInfo) {
      onShowLogin()
      return
    }
    if (!pending) void toggle(type, key)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex items-center transition-colors ${
        active
          ? 'text-[rgb(var(--primary))]'
          : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))]'
      } ${pending ? 'opacity-60 cursor-wait' : 'cursor-pointer'} ${className}`}
    >
      <Icon className={`${iconClassName} shrink-0`} aria-hidden="true" />
      {showLabel && <span>{active ? '已收藏' : '收藏'}</span>}
    </button>
  )
}
