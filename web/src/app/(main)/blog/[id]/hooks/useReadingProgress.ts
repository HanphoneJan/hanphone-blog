'use client'

import { useEffect, useRef } from 'react'

interface UseReadingProgressOptions {
  dispatch: React.Dispatch<any>
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useReadingProgress({ dispatch, containerRef }: UseReadingProgressOptions) {
  const prevProgress = useRef(-1)

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
        const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0

        // 仅在变化超过 1% 时才更新，减少无效渲染
        if (Math.abs(progress - prevProgress.current) < 1) return
        prevProgress.current = progress

        dispatch({ type: 'SET_READING_PROGRESS', payload: progress })
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [dispatch, containerRef])
}

export default useReadingProgress
