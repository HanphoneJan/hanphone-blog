/**
 * 媒体地址工具
 *
 * admin-file 的原片 URL 有两种历史形态：
 *   https://hanphone.top/blog/essay/foo.png
 *   https://hanphone.top/blog%2Fessay/foo.png   （旧数据，整段斜杠编码）
 *
 * 派生资源统一走 /media/*（状态/封面/缩略图）与 /hls/*（视频分片），并且只对本站文件生效；外链原样返回。
 */

import { PICTURE_BASE_URL } from './api'

const BASE = PICTURE_BASE_URL.replace(/\/+$/, '')

const FILE_ORIGINS = new Set<string>()
function addOrigin(url: string) {
  try {
    FILE_ORIGINS.add(new URL(url).origin)
  } catch {
    // 忽略非法配置
  }
}
addOrigin(BASE)
addOrigin(BASE.replace('://', '://www.'))

const THUMB_WIDTHS = [320, 800, 1600] as const

export interface MediaRendition {
  height: number
  width: number
  bandwidth: number
  playlist: string
}

export interface MediaMeta {
  status: 'ready' | 'pending' | 'processing' | 'failed' | 'none' | 'unavailable'
  progress?: number
  stage?: string | null
  error?: string | null
  original?: string
  download?: string
  metaUrl?: string
  poster?: string | null
  hls?: string | null
  duration?: number | null
  width?: number | null
  height?: number | null
  version?: string | null
  renditions?: MediaRendition[]
}

/**
 * 本站文件 URL → 相对 uploads 的路径；外链 / blob / data 返回 null。
 */
export function toMediaPath(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('blob:') || url.startsWith('data:')) return null

  let parsed: URL
  try {
    parsed = new URL(url, BASE)
  } catch {
    return null
  }

  if (!FILE_ORIGINS.has(parsed.origin)) return null

  let pathname = parsed.pathname.replace(/^\/+/, '')
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    // 保留原始 pathname
  }

  if (!pathname || pathname.includes('\0')) return null
  // 已经是派生接口或派生目录，避免二次包装
  if (pathname.startsWith('media/') || pathname.startsWith('.video/')) return null

  return pathname
}

/** 图片缩略图接口（服务端 302 到带版本号的 WebP；没有则回退原图） */
export function thumbUrlFor(url?: string | null, width: number = 800): string | null {
  const rel = toMediaPath(url)
  if (!rel) return null

  const w = (THUMB_WIDTHS as readonly number[]).includes(width) ? width : 800
  return `${BASE}/media/thumb?path=${encodeURIComponent(rel)}&w=${w}`
}

/** 生成 srcset；已知原图宽度时跳过比原图还大的档位 */
export function imageSrcSet(
  url?: string | null,
  widths: readonly number[] = THUMB_WIDTHS,
  intrinsicWidth?: number | null
): string | undefined {
  const candidates = widths.filter((w) => !intrinsicWidth || intrinsicWidth <= 0 || w <= intrinsicWidth)
  if (!candidates.length) return undefined

  const entries = candidates
    .map((w) => {
      const src = thumbUrlFor(url, w)
      return src ? `${src} ${w}w` : null
    })
    .filter(Boolean) as string[]

  // 原图比最大缩略图档还小（或尺寸不成档）时，把原图本身作为一个候选，
  // 避免只能选 320w 再被放大，保证 DPR2 下有足够清晰度。
  if (entries.length && url && intrinsicWidth && intrinsicWidth > 0 && !candidates.includes(intrinsicWidth)) {
    entries.push(`${url} ${intrinsicWidth}w`)
  }

  return entries.length ? entries.join(', ') : undefined
}

/** 视频封面（未生成时 404，前端用 onError 回退占位） */
export function videoPosterUrl(url?: string | null): string | null {
  const rel = toMediaPath(url)
  if (!rel) return null
  return `${BASE}/media/poster.jpg?path=${encodeURIComponent(rel)}`
}

/** 视频派生状态接口 */
export function videoMetaUrl(url?: string | null): string | null {
  const rel = toMediaPath(url)
  if (!rel) return null
  return `${BASE}/media/meta?path=${encodeURIComponent(rel)}`
}

/** 强制下载原文件；外链不加参数 */
export function downloadUrlFor(url?: string | null): string {
  if (!url) return ''
  if (!toMediaPath(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}download=1`
}

/** 拉取视频 HLS/海报/状态；失败返回 null，由播放器回退原片 */
export async function fetchMediaMeta(
  url: string,
  options: { signal?: AbortSignal } = {}
): Promise<MediaMeta | null> {
  const endpoint = videoMetaUrl(url)
  if (!endpoint) return null

  try {
    const res = await fetch(endpoint, {
      cache: 'no-store',
      signal: options.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as MediaMeta & { code?: number }
    if (!data || !data.status) return null
    return data
  } catch {
    return null
  }
}
