'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { fetchMediaMeta, videoPosterUrl, type MediaMeta } from '@/lib/media'

interface VideoPlayerProps {
  /** 原片地址（始终保留，作为 HLS 不可用时的兜底） */
  src: string
  autoPlay?: boolean
  className?: string
  poster?: string | null
}

/**
 * 视频播放器
 *
 * - 优先读取 /media/meta：有 HLS 就用 hls.js（Safari 走原生 HLS），没有就播放原片；
 * - 转码中/失败/格式不支持时都有明确回退，原片始终可播放、可下载；
 * - preload="none"：只有真正打开播放器才拉视频，列表页只显示封面。
 */
export function VideoPlayer({ src, autoPlay = false, className, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [media, setMedia] = useState<MediaMeta | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | undefined>(
    poster || videoPosterUrl(src) || undefined
  )
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let hls: { destroy: () => void; recoverMediaError: () => void } | null = null
    let usingHls = false

    setMessage(null)
    setMedia(null)
    setPosterUrl(poster || videoPosterUrl(src) || undefined)

    const tryPlay = () => {
      if (!autoPlay || cancelled) return
      video.play().catch(() => {
        // 浏览器可能拦截自动播放；保留 controls，让用户点播放
      })
    }

    const playOriginal = (notice?: string) => {
      if (cancelled) return
      usingHls = false
      if (hls) {
        hls.destroy()
        hls = null
      }
      if (notice) setMessage(notice)
      if (video.src !== src) {
        video.src = src
        video.load()
      }
      tryPlay()
    }

    const onVideoError = () => {
      if (cancelled) return
      if (usingHls) {
        playOriginal('HLS 播放出错，已回退原片')
        return
      }
      setMessage('浏览器无法播放该格式，请下载原视频')
    }
    video.addEventListener('error', onVideoError)

    const metaAbort = new AbortController()
    const metaTimer = setTimeout(() => metaAbort.abort(), 5000)

    const setup = async () => {
      const meta = await fetchMediaMeta(src, { signal: metaAbort.signal })
      clearTimeout(metaTimer)
      if (cancelled) return
      setMedia(meta)

      if (meta?.poster) setPosterUrl(meta.poster)

      if (!meta?.hls) {
        playOriginal(meta?.status === 'failed' ? '高清转码失败，当前播放原片' : undefined)
        return
      }

      // Safari / iOS 原生支持 HLS
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        usingHls = true
        video.src = meta.hls
        video.load()
        tryPlay()
        return
      }

      try {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return
        if (!Hls.isSupported()) {
          playOriginal()
          return
        }

        usingHls = true
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
        }) as unknown as { destroy: () => void; recoverMediaError: () => void }

        const instance = hls as unknown as {
          loadSource: (url: string) => void
          attachMedia: (el: HTMLVideoElement) => void
          on: (event: string, cb: (event: unknown, data: { fatal?: boolean; type?: string }) => void) => void
        }

        instance.loadSource(meta.hls)
        instance.attachMedia(video)
        instance.on('hlsManifestParsed', () => tryPlay())
        instance.on('hlsError', (_event, data) => {
          if (!data?.fatal) return
          if (data.type === 'mediaError' && hls) {
            try {
              hls.recoverMediaError()
              return
            } catch {
              // 继续走原片兜底
            }
          }
          playOriginal('HLS 播放出错，已回退原片')
        })
      } catch {
        playOriginal()
      }
    }

    setup().catch(() => playOriginal())

    return () => {
      cancelled = true
      clearTimeout(metaTimer)
      metaAbort.abort()
      video.removeEventListener('error', onVideoError)
      if (hls) {
        hls.destroy()
        hls = null
      }
    }
  }, [src, autoPlay, poster])

  const transcoding = media?.status === 'pending' || media?.status === 'processing'
  const progress = typeof media?.progress === 'number' ? media.progress : null

  return (
    <div className={`relative bg-black ${className || ''}`}>
      <video
        ref={videoRef}
        poster={posterUrl}
        controls
        playsInline
        preload="none"
        className="h-full w-full bg-black object-contain"
      />

      {transcoding && (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">
          高清转码中{progress !== null ? ` ${progress}%` : ''}，当前播放原画
        </div>
      )}

      {message && (
        <div className="pointer-events-none absolute inset-x-2 bottom-12 flex items-center justify-center gap-2 rounded bg-black/70 px-3 py-2 text-xs text-white">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
