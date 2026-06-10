'use client'

import { useEffect, useRef } from 'react'
import type { Heading } from '../types'

interface UseScrollSpyOptions {
  headings: Heading[]
  headerHeight: number
  dispatch: React.Dispatch<any>
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useScrollSpy({ headings, headerHeight, dispatch, containerRef }: UseScrollSpyOptions) {
  const activeHeadingRef = useRef('')
  // 缓存 heading DOM 元素，避免每帧 document.getElementById
  const elementCache = useRef<Map<string, HTMLElement>>(new Map())

  // headings 变化时重建缓存
  useEffect(() => {
    const cache = new Map<string, HTMLElement>()
    for (const h of headings) {
      const el = document.getElementById(h.originalId)
      if (el) cache.set(h.originalId, el)
    }
    elementCache.current = cache
  }, [headings])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId: number | null = null
    // 缓存 TOC 容器引用，避免 querySelector
    let navContainer: HTMLElement | null = null

    const handleScroll = () => {
      if (rafId !== null) return // 跳过，已有待处理的帧
      rafId = requestAnimationFrame(() => {
        rafId = null
        const cache = elementCache.current
        if (cache.size === 0) return

        const headerOffset = headerHeight + 100
        const containerTop = container.getBoundingClientRect().top
        let bestId = ''
        let bestTop = -Infinity

        for (const [id, el] of cache) {
          const rect = el.getBoundingClientRect()
          const elTop = rect.top - containerTop
          if (rect.top <= containerTop + headerOffset && elTop > bestTop) {
            bestTop = elTop
            bestId = id
          }
        }

        const newActive = bestId || [...cache.keys()][0]
        if (!newActive) return

        if (newActive !== activeHeadingRef.current) {
          activeHeadingRef.current = newActive
          dispatch({ type: 'SET_ACTIVE_HEADING', payload: newActive })

          // URL hash 同步
          if (typeof window !== 'undefined') {
            const newUrl = `${window.location.pathname}#${encodeURIComponent(newActive)}`
            window.history.replaceState(null, '', newUrl)
          }

          // TOC 自动滚动 — 仅在 heading 变化时执行
          if (!navContainer) {
            navContainer = document.querySelector<HTMLElement>('.sidebar-container,.blog-nav-prose')
          }
          if (navContainer) {
            const activeItem = navContainer.querySelector<HTMLElement>(
              `button[data-heading-id="${CSS.escape(newActive)}"]`
            )
            if (activeItem) {
              const containerRect = navContainer.getBoundingClientRect()
              const itemRect = activeItem.getBoundingClientRect()
              const threshold = containerRect.height * 0.5
              const relativeTop = itemRect.top - containerRect.top
              if (relativeTop > threshold || relativeTop < 0) {
                navContainer.scrollTop += relativeTop - (relativeTop > threshold ? threshold : 0)
              }
            }
          }
        }
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [headings, headerHeight, dispatch, containerRef])
}

export default useScrollSpy
