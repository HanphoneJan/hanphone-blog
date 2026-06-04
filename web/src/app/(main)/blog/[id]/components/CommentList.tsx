'use client'

import React from 'react'
import CommentItem from './CommentItem'
import type { CommentItem as CommentItemType, UserInfo } from '../types'

interface CommentListProps {
  comments: CommentItemType[]
  isMobile: boolean
  rpActiveId: number
  currentUser: UserInfo | null
  administrator: boolean
  blogAuthorId: number
  dispatch: React.Dispatch<any>
  submitReply: (content: string, commentId: number) => void
  handleDeleteComment: (id: number) => Promise<void>
}

function CommentList({
  comments,
  isMobile,
  rpActiveId,
  currentUser,
  administrator,
  blogAuthorId,
  dispatch,
  submitReply,
  handleDeleteComment
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center text-[rgb(var(--text-muted))] blog-text-sm py-3">
        暂无评论，快来发表第一条评论吧
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {comments.map((comment, index) => {
        const isLast = index === comments.length - 1
        return (
          <CommentItem
            key={comment.id}
            comment={comment}
            isLast={isLast}
            isMobile={isMobile}
            rpActiveId={rpActiveId}
            currentUser={currentUser}
            administrator={administrator}
            blogAuthorId={blogAuthorId}
            dispatch={dispatch}
            submitReply={submitReply}
            handleDeleteComment={handleDeleteComment}
          />
        )
      })}
    </div>
  )
}

export default React.memo(CommentList)
