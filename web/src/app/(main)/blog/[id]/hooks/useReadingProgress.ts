'use client'

import { useState, useEffect, useRef } from 'react'

interface UseReadingProgressOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useReadingProgress({ containerRef }: UseReadingProgressOptions) {
  const [progress, setProgress] = useState(0)
  const prevRef = useRef(-1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId: number | null = null

    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight - container.clientHeight
        const p = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0
        // 只在跨 1% 阈值时更新，避免无效渲染
        if (Math.abs(p - prevRef.current) < 1) return
        prevRef.current = p
        setProgress(p)
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [containerRef])

  return { progress }
}

export default useReadingProgress
