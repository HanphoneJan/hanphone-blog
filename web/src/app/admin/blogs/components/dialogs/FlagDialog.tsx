'use client'

import { createPortal } from 'react-dom'
import ModalOverlay from '@/components/shared/ModalOverlay'
import type { Blog } from '../../types'

interface FlagDialogProps {
  visible: boolean
  selectedFlag: string
  currentBlog: Blog | null
  onClose: () => void
  onSelect: (flag: string) => void
  onSubmit: () => void
}

export function FlagDialog({
  visible,
  selectedFlag,
  onClose,
  onSelect,
  onSubmit
}: FlagDialogProps) {
  if (!visible) return null

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card)/0.9)] border-[rgb(var(--border))] backdrop-blur-lg rounded-xl border w-full max-w-md p-6 shadow-2xl dark:bg-[rgb(var(--card)/0.9)] dark:border-[rgb(var(--border))]">
        <h3 className="text-xl font-semibold mb-4 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">修改文章类型</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">选择文章类型</label>
            <select
              value={selectedFlag}
              onChange={e => onSelect(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:ring-[rgb(var(--primary))] text-sm focus:outline-none focus:ring-2 transition-all dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:text-[rgb(var(--text))] dark:focus:ring-[rgb(var(--primary))]"
            >
              <option value="原创">原创</option>
              <option value="转载">转载</option>
              <option value="翻译">翻译</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
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
              确认修改
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
