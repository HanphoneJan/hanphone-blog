'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import type { FileType } from '../types'

interface ImageZoomModalProps {
  visible: boolean
  url: string
  type: FileType
  onClose: () => void
}

export function ImageZoomModal({ visible, url, type, onClose }: ImageZoomModalProps) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-20 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="h-6 w-6" />
      </button>

      {type === 'image' && (
        <div className="max-w-full max-h-[80vh] relative" onClick={e => e.stopPropagation()}>
          <Image
            src={url}
            alt="放大图片"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
            width={1200}
            height={800}
            priority={true}
            loading="eager"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  )
}

export default ImageZoomModal
