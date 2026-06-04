'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { TIME } from '@/lib/constants'
/**
 * 全局加载进度条组件
 * 在路由切换时显示顶部进度条，增加呼吸感
 */
export function LoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 路由开始变化时显示进度条
    setIsLoading(true)

    // 使用定时器模拟加载过程
    const timer1 = setTimeout(() => {
      setIsLoading(false)
    }, TIME.LOADING_BAR_DURATION)

    return () => {
      clearTimeout(timer1)
    }
  }, [pathname, searchParams])

  return (
    <div
      id='global-loading-bar'
      className={isLoading ? 'active' : ''}
      aria-hidden='true'
    />
  )
}
