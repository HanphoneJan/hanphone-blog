'use client'

import { Plus, X } from 'lucide-react'
import type { Blog } from '../types'

interface TagManagerProps {
  blog: Blog
  inputRef: React.RefObject<HTMLInputElement | null>
  onShowInput: (blog: Blog) => void
  onInputConfirm: (blog: Blog) => void
  onTagClose: (index: number, blog: Blog) => void
  onEnterKeyPress: (e: React.KeyboardEvent, blog: Blog) => void
  onInputChange: (blogId: number, value: string) => void
}

export function TagManager({
  blog,
  inputRef,
  onShowInput,
  onInputConfirm,
  onTagClose,
  onEnterKeyPress,
  onInputChange
}: TagManagerProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {blog.tags.map((tag, i) => (
        <span
          key={tag.id}
          className="px-2 py-0.5 rounded text-xs flex items-center gap-1 bg-purple-100/60 text-purple-700 dark:bg-purple-600/20 dark:text-purple-300"
        >
          {tag.name}
          <X
            className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-white"
            onClick={() => onTagClose(i, blog)}
          />
        </span>
      ))}
      {!blog.inputVisible && (
        <button
          onClick={() => onShowInput(blog)}
          className="px-2 py-0.5 border border-dashed rounded text-xs flex items-center border-[rgb(var(--text-muted))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] hover:border-[rgb(var(--text))] dark:border-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))] dark:hover:text-white dark:hover:border-[rgb(var(--text-muted))]"
        >
          <Plus className="h-3 w-3 mr-1" />
          添加
        </button>
      )}
      {blog.inputVisible && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={blog.inputValue || ''}
            onChange={e => onInputChange(blog.id, e.target.value)}
            onBlur={() => onInputConfirm(blog)}
            onKeyPress={e => onEnterKeyPress(e, blog)}
            className="w-24 px-2 py-0.5 text-xs border rounded border-[rgb(var(--border))] bg-[rgb(var(--card))/0.6] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-1 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))/0.6] dark:focus:ring-[rgb(var(--primary))]"
            placeholder="输入标签..."
          />
        </div>
      )}
    </div>
  )
}
