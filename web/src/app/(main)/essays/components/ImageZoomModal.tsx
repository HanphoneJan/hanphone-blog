'use client'

import Image from 'next/image'
import { Download, X } from 'lucide-react'
import type { FileType } from '../types'
import { downloadUrlFor } from '@/lib/media'
import { VideoPlayer } from '@/components/VideoPlayer'

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
      className="fixed inset-0 z-50 bg-[rgb(var(--overlay))]/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-20 right-4 text-white bg-[rgb(var(--overlay))]/50 p-2 rounded-full hover:bg-[rgb(var(--overlay))]/70 transition-colors"
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
            loading="lazy"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}

      {type === 'video' && (
        <div
          className="w-full max-w-4xl flex flex-col gap-2"
          onClick={e => e.stopPropagation()}
        >
          <VideoPlayer
            src={url}
            autoPlay
            className="w-full max-h-[80vh] aspect-video overflow-hidden rounded-lg"
          />
          <div className="flex justify-end">
            <a
              href={downloadUrlFor(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              <Download className="h-3.5 w-3.5" />
              下载原视频
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageZoomModal
