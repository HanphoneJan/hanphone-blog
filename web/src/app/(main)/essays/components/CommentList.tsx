'use client'

import { useRef, useCallback } from 'react'
import type { Essay, UserInfo } from '../types'

interface CommentListProps {
  essay: Essay
  isMobile: boolean
  userInfo: UserInfo | null
  administrator: boolean
  replyInputs: Record<number, string>
  showReplyBox: Record<number, boolean>
  onDeleteComment: (essayId: number, commentId: number) => void
  onToggleReplyBox: (commentId: number, currentValue: boolean) => void
  onReplyChange: (commentId: number, value: string) => void
  onSubmitReply: (essayId: number, commentId: number) => void
}

export function CommentList({
  essay,
  isMobile,
  userInfo,
  administrator,
  replyInputs,
  showReplyBox,
  onDeleteComment,
  onToggleReplyBox,
  onReplyChange,
  onSubmitReply
}: CommentListProps) {
  const replyInputRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  // 处理长按开始
  const handleTouchStart = useCallback((commentId: number) => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      onDeleteComment(essay.id, commentId)
    }, 500) // 500ms 长按触发
  }, [essay.id, onDeleteComment])

  // 处理长按结束
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleSubmitReply = (commentId: number) => {
    onSubmitReply(essay.id, commentId)
    setTimeout(() => {
      if (replyInputRefs.current[commentId]) {
        replyInputRefs.current[commentId]?.focus()
      }
    }, 0)
  }

  return (
    <div>
      {essay.comments.length > 0 ? (
        <div>
          {essay.comments.map((comment) => {
            return (
              <div key={comment.id} className="px-3 py-1.5">
                <div
                  className="flex items-start cursor-pointer select-none"
                  onClick={() => {
                    if (!isLongPress.current) {
                      onToggleReplyBox(comment.id, showReplyBox[comment.id] || false)
                    }
                  }}
                  onMouseDown={() => administrator && handleTouchStart(comment.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onTouchStart={() => administrator && handleTouchStart(comment.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="flex-1 min-w-0 leading-relaxed">
                    {/* 有回复关系时显示"昵称 回复 @被回复者"，否则仅显示"昵称：" */}
                    <p className="text-sm text-[rgb(var(--card-foreground))] wrap-break-word">
                      <span className="text-sm font-medium text-[rgb(var(--primary))]">{comment.nickname}</span>
                      {comment.repliedToNickname ? (
                        <>
                          <span className="text-sm font-medium text-[rgb(var(--card-foreground))]"> 回复 </span>
                          <span className="text-sm font-medium text-[rgb(var(--primary))]">@{comment.repliedToNickname}</span>
                          <span className="text-sm font-medium text-[rgb(var(--card-foreground))]">：</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-[rgb(var(--card-foreground))]">：</span>
                      )}
                      <span className="text-sm">{comment.content}</span>
                    </p>

                    {showReplyBox[comment.id] && (
                      <div className="mt-1.5 relative flex items-center gap-2">
                        <textarea
                          ref={(el) => {
                            replyInputRefs.current[comment.id] = el
                          }}
                          value={replyInputs[comment.id] || ''}
                          onChange={(e) => onReplyChange(comment.id, e.target.value)}
                          placeholder={`回复 @${comment.nickname}`}
                          className="flex-1 bg-[rgb(var(--card))] border border-[rgb(var(--border)/0.5)] rounded-full px-3 py-1.5 text-xs text-[rgb(var(--card-foreground))] placeholder:text-[rgb(var(--muted-foreground))] placeholder:opacity-30 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary)/0.4)] focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none h-8 leading-tight"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubmitReply(comment.id)
                          }}
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            replyInputs[comment.id]?.trim() && userInfo
                              ? 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.9)] text-white'
                              : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground)/0.5)] cursor-not-allowed'
                          }`}
                          disabled={!replyInputs[comment.id]?.trim() || !userInfo}
                        >
                          发送
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default CommentList
