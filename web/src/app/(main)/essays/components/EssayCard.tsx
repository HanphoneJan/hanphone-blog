'use client'

import { useRef, useMemo } from 'react'
import Image from 'next/image'
import { User, Clock, Heart, MessageCircle, ArrowBigUpDash } from 'lucide-react'
import { FileGallery } from './FileGallery'
import { CommentList } from './CommentList'
import type { Essay, UserInfo } from '../types'
import { formatDate } from '../utils'

interface EssayCardProps {
  essay: Essay
  isMobile: boolean
  userInfo: UserInfo | null
  administrator: boolean
  commentInput: string
  replyInputs: Record<number, string>
  showReplyBox: Record<number, boolean>
  onToggleLike: (essayId: number) => void
  onSubmitComment: (essayId: number, content: string) => void
  onSubmitReply: (essayId: number, commentId: number) => void
  onDeleteComment: (essayId: number, commentId: number) => void
  onCommentChange: (essayId: number, value: string) => void
  onReplyChange: (commentId: number, value: string) => void
  onToggleReplyBox: (commentId: number, currentValue: boolean) => void
  openFile: (url: string) => void
}

export function EssayCard({
  essay,
  isMobile,
  userInfo,
  administrator,
  commentInput,
  replyInputs,
  showReplyBox,
  onToggleLike,
  onSubmitComment,
  onSubmitReply,
  onDeleteComment,
  onCommentChange,
  onReplyChange,
  onToggleReplyBox,
  openFile
}: EssayCardProps) {
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmitComment = () => {
    onSubmitComment(essay.id, commentInput)
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus()
      }
    }, 0)
  }

  return (
    <div
      className={`${
        isMobile
          ? 'w-full bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm'
          : 'bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm transition-all duration-300 hover:shadow-lg overflow-hidden'
      }`}
    >
      <div className={`${isMobile ? 'px-4 py-2' : 'px-6 py-2'}`}>
        {/* 用户信息 */}
        <div className="flex items-center mb-4">
          {essay.avatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image src={essay.avatar} alt={`${essay.nickname}的头像`} fill loading="eager" className="object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[rgb(var(--muted))] flex items-center justify-center text-[rgb(var(--primary))] shrink-0">
              <User className="h-5 w-5" />
            </div>
          )}

          <div className="ml-3 flex-1">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[rgb(var(--card-foreground))]">{essay.nickname}</span>
                {essay.recommend && (
                  <div className="flex items-center text-[rgb(var(--primary))]">
                    <ArrowBigUpDash className="h-4 w-4 fill-[rgb(var(--primary))]" />
                  </div>
                )}
              </div>
              <span className="text-[rgb(var(--muted-foreground))] text-sm flex items-center gap-1 ml-2">
                <Clock className="h-3 w-3" />
                {formatDate(essay.createTime)}
              </span>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={`mb-4 ${isMobile ? 'text-base' : ''} overflow-hidden`}>
          {essay.title && (
            <h3 className="text-xl font-semibold text-[rgb(var(--card-foreground))] mb-3">{essay.title}</h3>
          )}
          {essay.content && (
            <div className="text-[rgb(var(--muted-foreground))] leading-relaxed whitespace-pre-line">
              {essay.content}
            </div>
          )}
        </div>

        {/* 文件展示区域 */}
        <FileGallery essay={essay} isMobile={isMobile} openFile={openFile} />

        {/* 互动区域 */}
        <div
          className={`flex justify-between items-center ${
            isMobile ? 'pt-1 pb-2' : 'pt-2 mb-2'
          }`}
        >
          <button
            onClick={() => onToggleLike(essay.id)}
            disabled={!userInfo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              !userInfo
                ? 'text-[rgb(var(--muted-foreground)/0.6)] cursor-not-allowed'
                : essay.isLiked
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted)/0.8)] hover:text-[rgb(var(--muted-foreground)/0.8)]'
            }`}
            style={essay.isLiked && userInfo ? { color: '#ef4444' } : undefined}
          >
            {essay.isLiked ? (
              <Heart className="h-4 w-4" style={{ fill: '#ef4444', color: '#ef4444' }} />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            <span>{essay.likeCount}</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted)/0.8)] hover:text-[rgb(var(--muted-foreground)/0.8)] transition-all">
            <MessageCircle className="h-4 w-4" />
            <span>{essay.commentCount}</span>
          </button>
        </div>

        {/* 评论输入框 */}
        <div className="flex items-center gap-2 mb-2">
          <textarea
            ref={commentInputRef}
            value={commentInput}
            onChange={e => onCommentChange(essay.id, e.target.value)}
            placeholder="写下你的评论..."
            className="flex-1 bg-[rgb(var(--muted))] border border-[rgb(var(--border)/0.6)] rounded-full px-4 py-2 text-sm text-[rgb(var(--card-foreground))] placeholder-[rgb(var(--muted-foreground))/0.6] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary)/0.4)] focus:border-[rgb(var(--primary)/0.6)] transition-colors resize-none h-9"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentInput?.trim() || !userInfo}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              commentInput?.trim() && userInfo
                ? 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.9)] text-white'
                : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground)/0.5)] cursor-not-allowed'
            }`}
          >
            发布
          </button>
        </div>

        {/* 评论列表 */}
        <CommentList
          essay={essay}
          isMobile={isMobile}
          userInfo={userInfo}
          administrator={administrator}
          replyInputs={replyInputs}
          showReplyBox={showReplyBox}
          onDeleteComment={onDeleteComment}
          onToggleReplyBox={onToggleReplyBox}
          onReplyChange={onReplyChange}
          onSubmitReply={onSubmitReply}
        />
      </div>
    </div>
  )
}

export default EssayCard
