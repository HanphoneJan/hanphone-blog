'use client'
/* eslint-disable @next/next/no-img-element -- 封面走 /media/poster.jpg，需要 onError 回退，不使用 next/image */

import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { videoPosterUrl } from '@/lib/media'

interface VideoPosterThumbProps {
  url: string
  alt?: string
  className?: string
  showPlay?: boolean
}

/**
 * 视频封面占位（纯图片，不创建 <video>、不拉视频数据）。
 * 还没生成海报或外链视频时显示深色渐变 + 播放按钮。
 */
export function VideoPosterThumb({
  url,
  alt = '视频封面',
  className,
  showPlay = true,
}: VideoPosterThumbProps) {
  const poster = videoPosterUrl(url)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [url])

  return (
    <div className={`relative overflow-hidden bg-black ${className || ''}`}>
      {poster && !failed ? (
        <img
          src={poster}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950" />
      )}

      {showPlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/55 p-2 text-white shadow-sm">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </div>
      )}
    </div>
  )
}

export default VideoPosterThumb
