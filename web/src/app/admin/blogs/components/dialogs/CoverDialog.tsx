'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Loader2, Image as ImageIcon, X } from 'lucide-react'
import ModalOverlay from '@/components/shared/ModalOverlay'
import type { Blog } from '../../types'

interface CoverDialogProps {
  visible: boolean
  dialogImageUrl: string
  isUploading: boolean
  uploadProgress: number
  currentBlog: Blog | null
  uploadRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
  onUpload: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onSubmit: () => void
}

export function CoverDialog({
  visible,
  dialogImageUrl,
  isUploading,
  uploadProgress,
  uploadRef,
  onClose,
  onUpload,
  onFileChange,
  onRemoveImage,
  onSubmit
}: CoverDialogProps) {
  if (!visible) return null

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card)/0.9)] border-[rgb(var(--border))] backdrop-blur-lg rounded-xl border w-full max-w-md p-6 shadow-2xl dark:bg-[rgb(var(--card)/0.9)] dark:border-[rgb(var(--border))]">
        <h3 className="text-xl font-semibold mb-4 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">修改首图</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">上传图片</label>
            <input
              ref={uploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
            <button
              onClick={onUpload}
              disabled={isUploading}
              className="w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  上传中... {uploadProgress}%
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  选择图片
                </>
              )}
            </button>
          </div>

          {dialogImageUrl && (
            <div className="relative rounded-lg overflow-hidden border border-[rgb(var(--border))]">
              <Image
                src={dialogImageUrl}
                alt="首图预览"
                width={400}
                height={300}
                className="w-full h-auto object-cover"
              />
              <button
                onClick={onRemoveImage}
                className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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
