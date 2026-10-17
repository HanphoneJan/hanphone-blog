'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { BREAKPOINT } from '@/lib/constants'

// 延迟加载 Live2D 及其依赖的 pixi.js，避免打进全站公共包（约 580KB）
const Live2DWidgetComponent = dynamic(
  () => import('@/lib/live2d').then((m) => m.Live2DWidget),
  { ssr: false }
)

const Live2DWidget = () => {
  const pathname = usePathname()
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
    let cancel: () => void
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(() => setReady(true), { timeout: 3000 })
      cancel = () => (window as any).cancelIdleCallback?.(handle)
    } else {
      const handle = (window as any).setTimeout(() => setReady(true), 2000)
      cancel = () => (window as any).clearTimeout(handle)
    }
    return () => cancel()
  }, [])

  // 滚动到 hero 区域时隐藏 widget；非首页（无 hero）则显示。
  // 依赖 pathname：路由切换时重新判定（effect 只跑一次会导致离开首页后仍隐藏、
  // 或从其它页返回首页时桌宠留在 hero 上）。
  // 注意：进入首页会先渲染 (main)/loading.tsx 的加载态，hero 晚于本 effect 出现，
  // 故仅首页下用 MutationObserver 等待 hero 挂载后再判定。
  useEffect(() => {
    const apply = () => {
      const hero = document.getElementById('parallaxHero')
      if (!hero) {
        setHidden(false)
        return
      }
      setHidden(hero.getBoundingClientRect().bottom > 100)
    }

    apply()

    // 仅首页存在 hero；其它页面直接显示，无需监听
    if (pathname !== '/') return

    const attachScroll = () => {
      window.addEventListener('scroll', apply, { passive: true })
      window.addEventListener('resize', apply, { passive: true })
    }

    let observer: MutationObserver | null = null
    let stopTimer = 0
    if (document.getElementById('parallaxHero')) {
      attachScroll()
    } else {
      observer = new MutationObserver(() => {
        if (document.getElementById('parallaxHero')) {
          observer?.disconnect()
          observer = null
          window.clearTimeout(stopTimer)
          attachScroll()
          apply()
        }
      })
      observer.observe(document.documentElement, { childList: true, subtree: true })
      // 兜底：仍未出现则停止观察，避免长驻监听开销
      stopTimer = window.setTimeout(() => {
        observer?.disconnect()
        observer = null
      }, 15000)
    }

    return () => {
      window.clearTimeout(stopTimer)
      observer?.disconnect()
      window.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [pathname])

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