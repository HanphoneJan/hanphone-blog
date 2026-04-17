'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, Trash2, Reply as ReplyIcon, Send } from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'
import type { CommentItem as CommentItemType, UserInfo } from '../types'

interface CommentItemProps {
  comment: CommentItemType
  isLast: boolean
  isMobile: boolean
  rpActiveId: number
  currentUser: UserInfo | null
  administrator: boolean
  blogAuthorId: number
  dispatch: React.Dispatch<any>
  submitReply: (content: string, commentId: number) => void
  handleDeleteComment: (id: number) => Promise<void>
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function CommentItemComponent({
  comment,
  isLast,
  isMobile,
  rpActiveId,
  currentUser,
  administrator,
  blogAuthorId,
  dispatch,
  submitReply,
  handleDeleteComment
}: CommentItemProps) {
  const showReplyInput = rpActiveId === comment.id
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    if (showReplyInput) {
      const textarea = document.querySelector(
        `#reply-textarea-${comment.id}`
      ) as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
      }
    }
  }, [showReplyInput, comment.id])

  const handleSubmitReply = () => {
    if (!replyContent.trim()) {
      showAlert(BLOG_DETAIL_LABELS.REPLY_PLACEHOLDER)
      return
    }
    submitReply(replyContent, comment.id)
    setReplyContent('')
    dispatch({ type: 'SET_RP_ACTIVE_ID', payload: -1 })
  }

  const toggleReply = () => {
    if (showReplyInput) {
      dispatch({ type: 'SET_RP_ACTIVE_ID', payload: -1 })
    } else {
      dispatch({ type: 'SET_RP_ACTIVE_ID', payload: comment.id })
    }
  }

  return (
    <div
      className={`${
        isMobile
          ? 'bg-[rgb(var(--card))] p-2'
          : `p-3 ${!isLast ? 'border-b border-[rgb(var(--border))]' : ''}`
      }`}
    >
      <div className="flex items-start">
        {comment.avatar ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[rgb(var(--border))]">
            <Image
              src={comment.avatar}
              alt={`${comment.nickname}的头像`}
              width={32}
              height={32}
              loading="lazy"
              sizes="32px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[rgb(var(--border)/0.2)] flex items-center justify-center text-[rgb(var(--primary))] shrink-0 border border-[rgb(var(--border)/0.3)]">
            <User className="h-4 w-4" />
          </div>
        )}

        <div className="ml-1 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="blog-text-xs font-medium text-[rgb(var(--text))]">
                {comment.nickname}
              </span>
              {comment.parentComment && (
                <span className="blog-text-xs text-[rgb(var(--text-muted))]">
                  回复{' '}
                  <span className="text-[rgb(var(--primary))]">
                    {comment.parentComment.nickname}
                  </span>
                </span>
              )}
              <span className="blog-text-xs text-[rgb(var(--text-muted))]">
                {formatDate(comment.createTime)}
              </span>
              {comment?.userId === blogAuthorId && (
                <span className="blog-text-xs bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] px-1.5 py-0.5 rounded-full">
                  作者
                </span>
              )}
            </div>
            {administrator && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="blog-text-xs text-[rgb(var(--error))] hover:text-[rgb(var(--error-dark))] flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>删除</span>
              </button>
            )}
          </div>
          <p
            className={`blog-text-sm text-[rgb(var(--text))] ${
              isMobile
                ? 'cursor-pointer hover:bg-[rgb(var(--border)/0.2)] rounded transition-colors'
                : ''
            }`}
            onClick={() => isMobile && toggleReply()}
          >
            {comment.content}
          </p>

          <div className="flex items-center gap-4 mt-1">
            {!isMobile && (
              <button
                onClick={toggleReply}
                disabled={!currentUser}
                className={`blog-text-sm text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] flex items-center gap-1 ${
                  !currentUser ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ReplyIcon className="h-3.5 w-3.5" />
                <span>回复</span>
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-2 relative">
              <textarea
                id={`reply-textarea-${comment.id}`}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder={`回复 @${comment.nickname}：`}
                className="w-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg p-2 pr-20 blog-text-sm text-[rgb(var(--text))] placeholder-[rgb(var(--text-muted))] focus:outline-none focus:border-[rgb(var(--primary))] transition-colors resize-none h-24"
                maxLength={1000}
                autoFocus
              />
              <div className="absolute right-2 bottom-2 flex gap-2">
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white px-2 py-1 rounded-md blog-text-sm transition-colors disabled:bg-[rgb(var(--border)/0.3)] disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  回复
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(CommentItemComponent)
