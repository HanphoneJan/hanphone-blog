'use client'

import React, { useEffect, useState } from 'react'
import { Live2DWidget as Live2DWidgetComponent } from '@/lib/live2d'
import { BREAKPOINT } from '@/lib/constants'

const Live2DWidget = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)

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

  // 滚动到 hero 区域时隐藏 widget
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('parallaxHero')
      if (!hero) return
      const rect = hero.getBoundingClientRect()
      // hero 还在视口内（底部还没滚出屏幕上方）时隐藏
      setHidden(rect.bottom > 100)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 防止水合不匹配
  if (!mounted) return null

  // 移动端且配置为不显示时，不渲染
  if (isMobile && process.env.NEXT_PUBLIC_LIVE2D_MOBILE === 'false') {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 right-0 z-[9999] transition-opacity duration-500 ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <Live2DWidgetComponent
        config={{
          drag: true,
          logLevel: 'info',
          tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'quit'],
        }}
        models={[
          {
            path: '/live2d/models/mimi/迷迷挂件.model3.json',
            name: '迷迷',
            message: '你好呀！我是迷迷~',
          },
          {
            path: '/live2d/models/ariu/ariu.model3.json',
            name: 'Ariu',
            message: '我是Ariu~',
          },
        ]}
      />
    </div>
  )
}

export default Live2DWidget
