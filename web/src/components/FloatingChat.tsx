'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, ExternalLink } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'
import './FloatingChat.css'

const CHAT_WIDTH = 380
const CHAT_HEIGHT = 580
const HEADER_HEIGHT = 36
const WINDOW_HEIGHT = CHAT_HEIGHT + HEADER_HEIGHT
const BUTTON_SIZE = 52
const MARGIN = 16
const STORAGE_KEY = 'floating-chat-anchor'
const DRAG_THRESHOLD = 5

interface Anchor {
  x: number
  y: number
}

function getDefaultAnchor(): Anchor {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  // 默认左下角，避开 Live2D（其初始位置距右 260、距底 380）
  return {
    x: BUTTON_SIZE + MARGIN,
    y: window.innerHeight - MARGIN,
  }
}

function loadAnchor(): Anchor {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Anchor
      if (typeof window !== 'undefined') {
        const maxX = window.innerWidth - MARGIN
        const maxY = window.innerHeight - MARGIN
        // 用按钮尺寸做边界检测，保存的按钮位置不应被过度限制
        const minX = BUTTON_SIZE + MARGIN
        const minY = BUTTON_SIZE + MARGIN
        return {
          x: Math.max(minX, Math.min(parsed.x, maxX)),
          y: Math.max(minY, Math.min(parsed.y, maxY)),
        }
      }
      return parsed
    }
  } catch { /* ignore */ }
  return getDefaultAnchor()
}

function saveAnchor(anchor: Anchor) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anchor))
  } catch { /* ignore */ }
}

interface FloatingChatProps {
  src?: string
}

// 各主题下按钮的特殊样式
const THEME_BUTTON_STYLES: Record<string, React.CSSProperties> = {
  light: {},
  dark: {},
  macaron: {
    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
  },
  cyber: {
    boxShadow: '0 0 16px rgba(6, 182, 212, 0.5), 0 0 32px rgba(6, 182, 212, 0.25)',
    border: '1px solid rgba(34, 211, 238, 0.4)',
  },
}

const CHAT_PUBLIC_PATH = '/chat/public'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''
const CHAT_PUBLIC_URL = `${SITE_URL}${CHAT_PUBLIC_PATH}`

export default function FloatingChat({ src = CHAT_PUBLIC_URL }: FloatingChatProps) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isInHero, setIsInHero] = useState(false)
  const dragRef = useRef({
    isDragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startAnchorX: 0,
    startAnchorY: 0,
  })
  const hasMovedRef = useRef(false)
  const dragStartPosRef = useRef({ x: 0, y: 0 })

  // 主题变化时触发的特殊效果
  const themeStyle = useMemo(() => THEME_BUTTON_STYLES[theme] || {}, [theme])

  // Initialize anchor position
  useEffect(() => {
    setAnchor(loadAnchor())
  }, [])

  // 检测是否在首页 hero section 内
  useEffect(() => {
    const isHome = pathname === '/'
    if (!isHome) {
      setIsInHero(false)
      return
    }

    const checkHero = () => {
      const hero = document.getElementById('parallaxHero')
      if (!hero) {
        setIsInHero(false)
        return
      }
      const rect = hero.getBoundingClientRect()
      // hero section 底部还在视口内（有可见区域）
      setIsInHero(rect.bottom > 0)
    }

    checkHero()
    window.addEventListener('scroll', checkHero, { passive: true })
    return () => window.removeEventListener('scroll', checkHero)
  }, [pathname])

  // 追踪窗口大小，用于渲染时位置约束
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 渲染时根据当前状态（打开/关闭）对 anchor 做边界约束，不修改原始 anchor 状态
  const constrainedAnchor = useMemo(() => {
    const minX = (isOpen ? CHAT_WIDTH : BUTTON_SIZE) + MARGIN
    const minY = (isOpen ? WINDOW_HEIGHT : BUTTON_SIZE) + MARGIN
    const maxX = windowSize.width - MARGIN
    const maxY = windowSize.height - MARGIN
    return {
      x: Math.max(minX, Math.min(anchor.x, maxX)),
      y: Math.max(minY, Math.min(anchor.y, maxY)),
    }
  }, [anchor, isOpen, windowSize])

  // Global mouse/touch events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return
      const dx = e.clientX - dragRef.current.startMouseX
      const dy = e.clientY - dragRef.current.startMouseY

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMovedRef.current = true
      }

      let newX = dragRef.current.startAnchorX + dx
      let newY = dragRef.current.startAnchorY + dy

      const minX = (isOpen ? CHAT_WIDTH : BUTTON_SIZE) + MARGIN
      const minY = (isOpen ? WINDOW_HEIGHT : BUTTON_SIZE) + MARGIN
      const maxX = window.innerWidth - MARGIN
      const maxY = window.innerHeight - MARGIN

      newX = Math.max(minX, Math.min(newX, maxX))
      newY = Math.max(minY, Math.min(newY, maxY))

      setAnchor({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false
        setIsDragging(false)
        setAnchor(prev => {
          saveAnchor(prev)
          return prev
        })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.isDragging || e.touches.length === 0) return
      const touch = e.touches[0]
      const dx = touch.clientX - dragRef.current.startMouseX
      const dy = touch.clientY - dragRef.current.startMouseY

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMovedRef.current = true
      }

      let newX = dragRef.current.startAnchorX + dx
      let newY = dragRef.current.startAnchorY + dy

      const minX = (isOpen ? CHAT_WIDTH : BUTTON_SIZE) + MARGIN
      const minY = (isOpen ? WINDOW_HEIGHT : BUTTON_SIZE) + MARGIN
      const maxX = window.innerWidth - MARGIN
      const maxY = window.innerHeight - MARGIN

      newX = Math.max(minX, Math.min(newX, maxX))
      newY = Math.max(minY, Math.min(newY, maxY))

      setAnchor({ x: newX, y: newY })
    }

    const handleTouchEnd = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false
        setIsDragging(false)
        setAnchor(prev => {
          saveAnchor(prev)
          return prev
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen])

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    let clientX: number, clientY: number
    if (e.nativeEvent instanceof TouchEvent) {
      const touchEvt = e as React.TouchEvent<HTMLElement>
      if (touchEvt.touches.length === 0) return
      clientX = touchEvt.touches[0].clientX
      clientY = touchEvt.touches[0].clientY
    } else {
      const mouseEvt = e as React.MouseEvent<HTMLElement>
      clientX = mouseEvt.clientX
      clientY = mouseEvt.clientY
    }

    hasMovedRef.current = false
    dragStartPosRef.current = { x: clientX, y: clientY }
    dragRef.current = {
      isDragging: true,
      startMouseX: clientX,
      startMouseY: clientY,
      startAnchorX: anchor.x,
      startAnchorY: anchor.y,
    }
    setIsDragging(true)
  }, [anchor])

  const handleToggle = useCallback(() => {
    if (hasMovedRef.current) return
    setIsOpen(prev => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Esc 关闭聊天窗口
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Calculate positions: constrainedAnchor is the bottom-right corner of the component
  const buttonLeft = constrainedAnchor.x - BUTTON_SIZE
  const buttonTop = constrainedAnchor.y - BUTTON_SIZE
  const windowLeft = constrainedAnchor.x - CHAT_WIDTH
  const windowTop = constrainedAnchor.y - WINDOW_HEIGHT

  // Check if component is ready (anchor loaded)
  const isReady = anchor.x !== 0 || anchor.y !== 0

  return (
    <>
      {/* Floating button (shown when closed) */}
      <button
        className="floating-chat-trigger fixed z-[9998] w-[52px] h-[52px] rounded-full shadow-lg flex items-center justify-center select-none touch-none transition-transform duration-300 hidden md:flex"
        style={{
          left: buttonLeft,
          top: buttonTop,
          backgroundColor: 'rgb(var(--primary))',
          color: 'white',
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: isOpen || !isReady || isInHero ? 'scale(0)' : 'scale(1)',
          opacity: isOpen || !isReady || isInHero ? 0 : 1,
          pointerEvents: isOpen || !isReady || isInHero ? 'none' : 'auto',
          ...themeStyle,
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={handleToggle}
        title="公共聊天室"
        aria-label="打开公共聊天室"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat window (shown when open) */}
      <div
        className="fixed z-[9999] rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hidden md:flex"
        style={{
          left: windowLeft,
          top: windowTop,
          width: CHAT_WIDTH,
          height: WINDOW_HEIGHT,
          backgroundColor: 'transparent',
          opacity: isOpen && isReady ? 1 : 0,
          transform: isOpen && isReady ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          pointerEvents: isOpen && isReady ? 'auto' : 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 按钮栏 - hover 时显示 */}
        <div
          className="flex items-center justify-end px-2 select-none touch-none shrink-0"
          style={{
            height: HEADER_HEIGHT,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div
            className="flex items-center gap-1.5 transition-opacity duration-150"
            style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}
          >
            <button
              onClick={() => window.open(CHAT_PUBLIC_URL, '_blank')}
              onMouseDown={(e) => e.stopPropagation()}
              className="floating-chat-header-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'rgb(var(--text-muted))' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--hover))'
                ;(e.currentTarget as HTMLElement).style.color = 'rgb(var(--text))'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'rgb(var(--text-muted))'
              }}
              aria-label="在新页面打开聊天室"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="floating-chat-header-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'rgb(var(--text-muted))' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--hover))'
                ;(e.currentTarget as HTMLElement).style.color = 'rgb(var(--text))'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'rgb(var(--text-muted))'
              }}
              aria-label="关闭聊天室"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iframe */}
        <iframe
          src={src}
          className="flex-1 w-full border-0 rounded-2xl"
          title="公共聊天室"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          allow="clipboard-write"
        />
      </div>
    </>
  )
}
