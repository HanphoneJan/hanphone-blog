'use client'

import { createPortal } from 'react-dom'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { ImageField } from '@/components/shared/ImageField'

interface CoverDialogProps {
  visible: boolean
  dialogImageUrl: string
  onClose: () => void
  onChangeUrl: (url: string) => void
  onSubmit: () => void
}

export function CoverDialog({
  visible,
  dialogImageUrl,
  onClose,
  onChangeUrl,
  onSubmit
}: CoverDialogProps) {
  if (!visible) return null

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card)/0.9)] border-[rgb(var(--border))]  rounded-xl border w-full max-w-md p-6 shadow-2xl dark:bg-[rgb(var(--card)/0.9)] dark:border-[rgb(var(--border))]">
        <h3 className="text-xl font-semibold mb-4 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">修改首图</h3>
        <div className="space-y-4">
          <ImageField
            value={dialogImageUrl}
            onChange={onChangeUrl}
            label="首图"
            namespace="blog/blogs"
            aspectRatio={16 / 9}
            previewSize={260}
            hint="建议 1200×630，支持 JPG/PNG，自动转 JPG。"
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg transition-all bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]"
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              disabled={!dialogImageUrl}
              className="flex-1 px-4 py-3 rounded-lg text-white transition-all disabled:opacity-50 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] dark:bg-[rgb(var(--primary))] dark:hover:bg-[rgb(var(--primary-hover))]"
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

export default CoverDialog
