'use client'

import { useState, useEffect, useRef } from 'react'
import type { Heading } from '../types'

interface UseScrollSpyOptions {
  headings: Heading[]
  headerHeight: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useScrollSpy({ headings, headerHeight, containerRef }: UseScrollSpyOptions) {
  const [activeHeading, setActiveHeading] = useState('')
  const activeRef = useRef('')
  const elementCache = useRef<Map<string, HTMLElement>>(new Map())

  // headings 变化时重建 DOM 元素缓存
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
    let tocContainer: HTMLElement | null = null

    const handleScroll = () => {
      if (rafId !== null) return
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

        if (newActive !== activeRef.current) {
          activeRef.current = newActive
          setActiveHeading(newActive)

          // URL hash 同步
          if (typeof window !== 'undefined') {
            const newUrl = `${window.location.pathname}#${encodeURIComponent(newActive)}`
            window.history.replaceState(null, '', newUrl)
          }

          // TOC 自动滚动
          if (!tocContainer) {
            tocContainer = document.querySelector<HTMLElement>('.sidebar-container,.blog-nav-prose')
          }
          if (tocContainer) {
            const item = tocContainer.querySelector<HTMLElement>(
              `button[data-heading-id="${CSS.escape(newActive)}"]`
            )
            if (item) {
              const cr = tocContainer.getBoundingClientRect()
              const ir = item.getBoundingClientRect()
              const threshold = cr.height * 0.5
              const relTop = ir.top - cr.top
              if (relTop > threshold || relTop < 0) {
                tocContainer.scrollTop += relTop - (relTop > threshold ? threshold : 0)
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
  }, [headings, headerHeight, containerRef])

  return { activeHeading }
}

export default useScrollSpy
