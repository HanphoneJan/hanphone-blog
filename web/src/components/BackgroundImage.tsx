'use client'

import { useState, useEffect } from 'react'
import { ASSETS, STORAGE_KEYS, BACKGROUND_CONFIG } from '@/lib/constants'

/**
 * 背景图组件：支持默认图 + 自定义（localStorage）
 * 内置透明度控制和遮罩层效果
 */
export default function BackgroundImage() {
  const [src, setSrc] = useState<string | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const [opacity, setOpacity] = useState(BACKGROUND_CONFIG.DEFAULT_OPACITY)
  const [overlay, setOverlay] = useState(BACKGROUND_CONFIG.DEFAULT_OVERLAY)

  // 加载背景图片
  const loadFromStorage = () => {
    if (typeof window === 'undefined') return
    
    const raw = localStorage.getItem(STORAGE_KEYS.BACKGROUND_CUSTOM)
    if (!raw || raw === 'default') {
      setSrc(null)
      setUseCustom(false)
      return
    }
    if (raw.startsWith('url:')) {
      setSrc(raw.slice(4))
      setUseCustom(true)
      return
    }
    if (raw.startsWith('data:image')) {
      setSrc(raw)
      setUseCustom(true)
      return
    }
    setSrc(null)
    setUseCustom(false)
  }

  // 加载透明度设置
  const loadOpacity = () => {
    if (typeof window === 'undefined') return
    const savedOpacity = localStorage.getItem(STORAGE_KEYS.BACKGROUND_OPACITY)
    if (savedOpacity) {
      const parsed = parseInt(savedOpacity, 10)
      if (!isNaN(parsed) && parsed >= BACKGROUND_CONFIG.MIN_OPACITY && parsed <= BACKGROUND_CONFIG.MAX_OPACITY) {
        setOpacity(parsed)
      }
    }
  }

  // 加载遮罩强度设置
  const loadOverlay = () => {
    if (typeof window === 'undefined') return
    const savedOverlay = localStorage.getItem(STORAGE_KEYS.BACKGROUND_OVERLAY)
    if (savedOverlay) {
      const parsed = parseInt(savedOverlay, 10)
      if (!isNaN(parsed) && parsed >= BACKGROUND_CONFIG.MIN_OVERLAY && parsed <= BACKGROUND_CONFIG.MAX_OVERLAY) {
        setOverlay(parsed)
      }
    }
  }

  useEffect(() => {
    loadFromStorage()
    loadOpacity()
    loadOverlay()

    // 监听背景图变化
    const bgHandler = () => loadFromStorage()
    window.addEventListener(BACKGROUND_CONFIG.CHANGE_EVENT, bgHandler)

    // 监听透明度变化
    const opacityHandler = () => loadOpacity()
    window.addEventListener(BACKGROUND_CONFIG.OPACITY_CHANGE_EVENT, opacityHandler)

    // 监听遮罩强度变化
    const overlayHandler = () => loadOverlay()
    window.addEventListener(BACKGROUND_CONFIG.OVERLAY_CHANGE_EVENT, overlayHandler)

    return () => {
      window.removeEventListener(BACKGROUND_CONFIG.CHANGE_EVENT, bgHandler)
      window.removeEventListener(BACKGROUND_CONFIG.OPACITY_CHANGE_EVENT, opacityHandler)
      window.removeEventListener(BACKGROUND_CONFIG.OVERLAY_CHANGE_EVENT, overlayHandler)
    }
  }, [])

  // 计算实际的透明度值（转换为 CSS 的 opacity 值）
  const imageOpacity = opacity / 100
  const overlayOpacity = overlay / 100

  if (useCustom && src) {
    return (
      <>
        {/* 自定义背景图 */}
        <img
          src={src}
          alt=""
          aria-hidden
          decoding="async"
          fetchPriority="high"
          className="fixed inset-0 z-0 w-screen h-screen object-cover pointer-events-none transition-opacity duration-500"
          style={{ opacity: imageOpacity }}
        />
        {/* 内置遮罩层 */}
        <div
          className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-500"
          style={{ 
            backgroundColor: `rgb(var(--bg))`,
            opacity: overlayOpacity
          }}
        />
      </>
    )
  }

  return (
    <>
      {/* 默认背景图 */}
      <picture className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <source srcSet={ASSETS.BACKGROUND_WEBP} type="image/webp" />
        <img
          src={ASSETS.BACKGROUND_JPEG}
          alt=""
          aria-hidden
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imageOpacity }}
        />
      </picture>
      {/* 内置遮罩层 */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-500"
        style={{ 
          backgroundColor: `rgb(var(--bg))`,
          opacity: overlayOpacity
        }}
      />
    </>
  )
}
