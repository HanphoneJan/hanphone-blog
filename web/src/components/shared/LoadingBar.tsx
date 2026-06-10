'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { TIME } from '@/lib/constants'

/**
 * 全局加载进度条 — 仅在路径变化时显示
 * 刻意不用 useSearchParams：histroy.replaceState 改变 hash 时
 * useSearchParams 返回新对象引用，会导致不必要的触发。
 * usePathname 返回 string，同值不触发 effect。
 */
export function LoadingBar() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const prev = useRef(pathname)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }

    if (prev.current === pathname) return
    prev.current = pathname

    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), TIME.LOADING_BAR_DURATION)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div id="global-loading-bar" className={isLoading ? 'active' : ''} aria-hidden="true" />
  )
}
