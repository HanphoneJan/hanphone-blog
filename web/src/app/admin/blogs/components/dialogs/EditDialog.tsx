'use client'

import { createPortal } from 'react-dom'
import ModalOverlay from '@/components/shared/ModalOverlay'
import type { Blog, EditBlogForm } from '../../types'

interface EditDialogProps {
  visible: boolean
  form: EditBlogForm
  currentBlog: Blog | null
  onClose: () => void
  onChange: (field: keyof EditBlogForm, value: string) => void
  onSubmit: () => void
}

export function EditDialog({
  visible,
  form,
  onClose,
  onChange,
  onSubmit
}: EditDialogProps) {
  if (!visible) return null

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card)/0.9)] border-[rgb(var(--border))] backdrop-blur-lg rounded-xl border w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl dark:bg-[rgb(var(--card)/0.9)] dark:border-[rgb(var(--border))]">
        <div className="p-6 border-b border-[rgb(var(--border))]">
          <h3 className="text-xl font-semibold text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">编辑博客</h3>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">标题</label>
              <input
                type="text"
                value={form.title}
                onChange={e => onChange('title', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[rgb(var(--card))/0.6] border-[rgb(var(--border))] text-[rgb(var(--text))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all dark:bg-[rgb(var(--bg))/0.6] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--text))] dark:focus:ring-[rgb(var(--primary))]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">描述</label>
              <textarea
                value={form.description}
                onChange={e => onChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-[rgb(var(--card))/0.6] border-[rgb(var(--border))] text-[rgb(var(--text))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all dark:bg-[rgb(var(--bg))/0.6] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--text))] dark:focus:ring-[rgb(var(--primary))]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">内容</label>
              <textarea
                value={form.content}
                onChange={e => onChange('content', e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-lg bg-[rgb(var(--card))/0.6] border-[rgb(var(--border))] text-[rgb(var(--text))] focus:ring-[rgb(var(--primary))] focus:outline-none focus:ring-2 transition-all dark:bg-[rgb(var(--bg))/0.6] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--text))] dark:focus:ring-[rgb(var(--primary))]"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[rgb(var(--border))]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg transition-all bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]"
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-3 rounded-lg text-white transition-all bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] dark:bg-[rgb(var(--primary))] dark:hover:bg-[rgb(var(--primary-hover))]"
            >
              保存修改
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
