'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Heading } from '../types'

interface UseTocOptions {
  content: string
  headerHeight: number
  dispatch: React.Dispatch<any>
}

export function useToc({ content, headerHeight, dispatch }: UseTocOptions) {
  const blogContentRef = useRef<HTMLDivElement>(null)
  const isHashHandledRef = useRef(false)

  // 提取标题
  useEffect(() => {
    if (!blogContentRef.current || !content) return

    const timer = setTimeout(() => {
      const headingElements = blogContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const extractedHeadings: Heading[] = []

      headingElements?.forEach(heading => {
        const originalId = heading.id
        if (!originalId) return
        extractedHeadings.push({
          originalId,
          text: heading.textContent || '',
          level: parseInt(heading.tagName.substring(1))
        })
      })

      dispatch({ type: 'SET_HEADINGS', payload: extractedHeadings })
    }, 0)

    return () => clearTimeout(timer)
  }, [content, dispatch])

  // 滚动到标题 - 在中间内容区域内滚动
  const scrollToHeading = useCallback((originalId: string, updateHash: boolean = true) => {
    if (!blogContentRef.current) return

    const element = document.getElementById(originalId)
    if (element) {
      const container = blogContentRef.current
      const headerOffset = headerHeight + 24
      const elementTop = (element as HTMLElement).offsetTop - headerOffset

      container.scrollTo({
        top: Math.max(0, elementTop),
        behavior: 'smooth'
      })

      // 更新 URL hash（不触发页面跳转）
      if (updateHash && typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}#${originalId}`
        window.history.replaceState(null, '', newUrl)
      }

      if (window.innerWidth < 1024) {
        dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false })
      }
    }
  }, [headerHeight, dispatch])

  // 处理哈希跳转 - 在中间内容区域内滚动
  useEffect(() => {
    if (typeof window !== 'undefined' && content && !isHashHandledRef.current && blogContentRef.current) {
      const hash = window.location.hash
      if (hash) {
        const targetId = decodeURIComponent(hash.slice(1))
        const element = document.getElementById(targetId)
        if (element) {
          setTimeout(() => {
            // 使用 scrollToHeading 但不更新 hash（避免重复替换）
            scrollToHeading(targetId, false)
            isHashHandledRef.current = true
          }, 100)
        } else {
          isHashHandledRef.current = true
        }
      } else {
        // 无哈希时滚动到顶部
        blogContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        isHashHandledRef.current = true
      }
    }
  }, [content, headerHeight, scrollToHeading])

  // 监听URL变化
  useEffect(() => {
    const handlePopState = () => {
      isHashHandledRef.current = false
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    blogContentRef,
    scrollToHeading
  }
}

export default useToc