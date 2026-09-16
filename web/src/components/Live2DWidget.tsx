'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { BREAKPOINT } from '@/lib/constants'

// 延迟加载 Live2D 及其依赖的 pixi.js，避免打进全站公共包（约 580KB）
const Live2DWidgetComponent = dynamic(
  () => import('@/lib/live2d').then((m) => m.Live2DWidget),
  { ssr: false }
)

const Live2DWidget = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [ready, setReady] = useState(false)

  // 检测是否为移动端
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINT.MD)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 首屏渲染完成、浏览器空闲后再加载 Live2D
  useEffect(() => {
    const id = 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback(() => setReady(true), { timeout: 3000 })
      : window.setTimeout(() => setReady(true), 2000)
    return () => {
      if (id && typeof id !== 'number' && typeof id.cancel === 'function') id.cancel()
      else if (typeof id === 'number') window.clearTimeout(id)
    }
  }, [])

  // 滚动到 hero 区域时隐藏 widget
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('parallaxHero')
      if (!hero) return
      const rect = hero.getBoundingClientRect()
      setHidden(rect.bottom > 100)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) return null

  if (isMobile && process.env.NEXT_PUBLIC_LIVE2D_MOBILE === 'false') {
    return null
  }

  if (!ready) return null

  return (
    <div
      className={`fixed bottom-0 right-0 z-[9999] transition-opacity duration-500 ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <Live2DWidgetComponent
        config={{
          drag: true,
          logLevel: 'info',
          tools: ['hitokoto', 'switch-model', 'photo', 'quit'],
        }}
        models={[
          { path: '/live2d/models/mimi/迷迷挂件.model3.json', name: '迷迷', message: '你好呀！我是迷迷~' },
          { path: '/live2d/models/ariu/ariu.model3.json', name: 'Ariu', message: '我是Ariu~' },
        ]}
      />
    </div>
  )
}

export default Live2DWidget