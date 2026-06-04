'use client'

import { useEffect } from 'react'

interface UseReadingProgressOptions {
  dispatch: React.Dispatch<any>
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useReadingProgress({ dispatch, containerRef }: UseReadingProgressOptions) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScrollProgress = () => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight - container.clientHeight
      const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0
      dispatch({ type: 'SET_READING_PROGRESS', payload: progress })
    }

    container.addEventListener('scroll', handleScrollProgress)
    handleScrollProgress()

    return () => {
      container.removeEventListener('scroll', handleScrollProgress)
    }
  }, [dispatch, containerRef])
}

export default useReadingProgress