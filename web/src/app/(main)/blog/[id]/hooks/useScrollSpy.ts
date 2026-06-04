'use client'

import { useEffect, useRef, useState } from 'react'
import type { Heading } from '../types'

interface UseScrollSpyOptions {
  headings: Heading[]
  headerHeight: number
  dispatch: React.Dispatch<any>
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useScrollSpy({ headings, headerHeight, dispatch, containerRef }: UseScrollSpyOptions) {
  const activeHeadingRef = useRef('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId: number | null = null

    const handleScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)

      rafId = requestAnimationFrame(() => {
        rafId = null
        if (headings.length === 0) return

        const headerOffset = headerHeight + 100
        const containerTop = container.getBoundingClientRect().top
        const visibleHeadings: { id: string; top: number }[] = []

        for (const heading of headings) {
          const element = document.getElementById(heading.originalId)
          if (!element) continue

          const rect = element.getBoundingClientRect()
          const elementTop = rect.top - containerTop

          if (rect.top <= containerTop + headerOffset) {
            visibleHeadings.push({ id: heading.originalId, top: elementTop })
          }
        }

        if (visibleHeadings.length > 0) {
          visibleHeadings.sort((a, b) => a.top - b.top)
          const newActiveHeading = visibleHeadings[visibleHeadings.length - 1].id
          if (newActiveHeading !== activeHeadingRef.current) {
            activeHeadingRef.current = newActiveHeading
            dispatch({ type: 'SET_ACTIVE_HEADING', payload: newActiveHeading })

            // 更新 URL hash（不触发页面跳转）
            if (typeof window !== 'undefined') {
              const newUrl = `${window.location.pathname}#${encodeURIComponent(newActiveHeading)}`
              window.history.replaceState(null, '', newUrl)
            }
          }

          // 自动滚动目录到可视区域
          const navContainer = document.querySelector('.sidebar-container,.blog-nav-prose')
          const activeNavItem = document.querySelector(
            `button[data-heading-id="${CSS.escape(newActiveHeading)}"]`
          )

          if (navContainer && activeNavItem) {
            const containerRect = navContainer.getBoundingClientRect()
            const itemRect = activeNavItem.getBoundingClientRect()
            const containerUpperHeight = containerRect.height * 0.5
            const itemRelativeTop = itemRect.top - containerRect.top

            if (itemRelativeTop > containerUpperHeight) {
              (navContainer as HTMLElement).scrollTop += itemRelativeTop - containerUpperHeight
            } else if (itemRelativeTop < 0) {
              ;(navContainer as HTMLElement).scrollTop += itemRelativeTop
            }
          }
        } else {
          const firstId = headings[0]?.originalId ?? ''
          if (firstId && activeHeadingRef.current !== firstId) {
            activeHeadingRef.current = firstId
            dispatch({ type: 'SET_ACTIVE_HEADING', payload: firstId })
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