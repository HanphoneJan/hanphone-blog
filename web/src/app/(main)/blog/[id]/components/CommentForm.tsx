'use client'

import React from 'react'
import Image from 'next/image'
import { Edit, Loader2 } from 'lucide-react'
import { ASSETS } from '@/lib/constants'
import type { UserInfo } from '../types'

interface CommentFormProps {
  content: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  currentUser: UserInfo | null
}

function CommentForm({
  content,
  onChange,
  onSubmit,
  loading,
  currentUser
}: CommentFormProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center mb-4">
        {currentUser ? (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[rgb(var(--border))]">
            <Image
              src={currentUser.avatar || ASSETS.DEFAULT_AVATAR}
              alt={`${currentUser.nickname}的头像`}
              width={40}
              height={40}
              loading="lazy"
              sizes="40px"
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[rgb(var(--border)/0.2)] flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border)/0.3)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <div className="ml-3">
          <div className="font-medium text-[rgb(var(--primary))] blog-text-md">
            {currentUser ? currentUser.nickname : '请登录后发表评论'}
          </div>
        </div>
      </div>

      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        rows={4}
        placeholder="写下你的评论..."
        disabled={!currentUser}
        className={`w-full px-4 py-3 rounded-lg border bg-[rgb(var(--card))] blog-text-md text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all resize-none
        ${
          !currentUser
            ? 'border-[rgb(var(--border)/0.3)] opacity-70 cursor-not-allowed'
            : 'border-[rgb(var(--border))]'
        }`}
        maxLength={1000}
      />
      <div className="flex justify-between items-center">
        <p className="text-[rgb(var(--text-muted))] blog-text-xs">
          {content.length}/1000 字
        </p>
        <button
          onClick={onSubmit}
          disabled={loading || !content.trim() || !currentUser}
          className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white blog-text-sm transition-colors flex items-center gap-2 disabled:bg-[rgb(var(--border)/0.3)] disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Edit className="h-4 w-4" />
          提交评论
        </button>
      </div>
    </div>
  )
}

export default CommentForm