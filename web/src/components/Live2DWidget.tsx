'use client'
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Expand } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'
import { BREAKPOINT, LIVE2D, TIME, Z_INDEX } from '@/lib/constants'

const Live2DWidget = () => {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isLongPress, setIsLongPress] = useState(false)
  const [dimensions, setDimensions] = useState({ width: LIVE2D.DEFAULT_WIDTH, height: LIVE2D.DEFAULT_HEIGHT })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // 检测是否为移动端
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT.MD)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // --- 1. 尺寸计算逻辑 ---
  const handleResize = useCallback(() => {
    let width, height
    if (window.innerWidth <= BREAKPOINT.XS) {
      width = LIVE2D.DIMENSIONS.XS.width
      height = LIVE2D.DIMENSIONS.XS.height
    } else if (window.innerWidth <= BREAKPOINT.SM) {
      width = LIVE2D.DIMENSIONS.SM.width
      height = LIVE2D.DIMENSIONS.SM.height
    } else if (window.innerWidth <= BREAKPOINT.MD) {
      width = LIVE2D.DIMENSIONS.MD.width
      height = LIVE2D.DIMENSIONS.MD.height
    } else {
      width = LIVE2D.DIMENSIONS.LG.width
      height = LIVE2D.DIMENSIONS.LG.height
    }
    setDimensions(prev => {
      if (prev.width === width && prev.height === height) return prev
      return { width, height }
    })
  }, [])

  // --- 2. 初始化和位置计算逻辑 (核心修改) ---
  useEffect(() => {
    const updatePosition = () => {
      const maxX = window.innerWidth - dimensions.width
      const maxY = window.innerHeight - dimensions.height

      // 只在未初始化或尺寸变化时设置到右下角
      if (!isInitialized) {
        setPosition({ x: maxX, y: maxY })
        setIsInitialized(true)
      } else {
        // 修正位置，防止超出边界
        // setPosition(prev => ({
        //   x: Math.max(0, Math.min(prev.x, maxX)),
        //   y: Math.max(0, Math.min(prev.y, maxY))
        // }))
        setPosition({ x: maxX, y: maxY })
      }
    }

    // 组件挂载后立即计算一次尺寸和位置
    handleResize()
    updatePosition()

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    window.addEventListener('resize', updatePosition)

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', updatePosition)
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [dimensions, handleResize, isInitialized])

  // --- 3. 拖拽逻辑 (修复被动事件监听器错误) ---
  const preventTextSelection = useCallback(() => {
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }, [])

  const restoreTextSelection = useCallback(() => {
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
  }, [])

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      dragStartPos.current = { x: clientX, y: clientY }
      setOffset({ x: clientX - rect.left, y: clientY - rect.top })
      setIsDragging(true)
      preventTextSelection()
    },
    [preventTextSelection]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      handleStart(e.clientX, e.clientY)
    },
    [handleStart]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      const touch = e.touches[0]
      dragStartPos.current = { x: touch.clientX, y: touch.clientY }
      longPressTimer.current = setTimeout(() => {
        handleStart(touch.clientX, touch.clientY)
        setIsLongPress(true)
      }, TIME.LONG_PRESS_DURATION)
    },
    [handleStart]
  )

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || typeof window === 'undefined') return
      const deltaX = Math.abs(clientX - dragStartPos.current.x)
      const deltaY = Math.abs(clientY - dragStartPos.current.y)
      if (deltaX < TIME.DRAG_MOVE_THRESHOLD && deltaY < TIME.DRAG_MOVE_THRESHOLD) return
      const newX = clientX - offset.x
      const newY = clientY - offset.y
      const maxX = window.innerWidth - dimensions.width
      const maxY = window.innerHeight - dimensions.height
      setPosition({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) })
    },
    [isDragging, offset, dimensions]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    },
    [handleMove]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging || isLongPress) {
        e.preventDefault() // 现在可以在非被动监听器中调用 preventDefault
        const touch = e.touches[0]
        handleMove(touch.clientX, touch.clientY)
      }
    },
    [isDragging, isLongPress, handleMove]
  )

  const handleEnd = useCallback(() => {
    setIsDragging(false)
    setIsLongPress(false)
    restoreTextSelection()
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [restoreTextSelection])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // 事件监听器设置 (修复被动事件监听器错误)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 为 touchmove 事件使用非被动监听器
    const touchMoveOptions = { passive: false }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, touchMoveOptions)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      restoreTextSelection()
    }
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, restoreTextSelection])

  // 位置未初始化时不渲染，避免左上角闪烁
  if (!isInitialized) return null

  // 移动端且配置为不显示时，不渲染
  if (isMobile && !LIVE2D.MOBILE_VISIBLE) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        zIndex: Z_INDEX.LIVE2D,
        pointerEvents: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'left 0.1s ease, top 0.1s ease' // 添加平滑过渡
      }}
    >
      <iframe
        src="/live2d.html"
        title="Live2D Model"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'hidden',
          zIndex: LIVE2D.IFRAME_Z_INDEX,
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: LIVE2D.BUTTON_OFFSET,
          right: LIVE2D.BUTTON_OFFSET,
          width: LIVE2D.BUTTON_SIZE,
          height: LIVE2D.BUTTON_SIZE,
          backgroundColor: isDragging
            ? `rgba(${theme === 'light' ? '59, 130, 246' : theme === 'dark' ? '59, 130, 246' : theme === 'macaron' ? '219, 39, 119' : theme === 'cyber' ? '6, 182, 212' : '59, 130, 246'}, 0.8)`
            : isLongPress
            ? `rgba(${theme === 'light' ? '34, 197, 94' : theme === 'dark' ? '34, 197, 94' : theme === 'macaron' ? '34, 197, 94' : theme === 'cyber' ? '16, 185, 129' : '34, 197, 94'}, 0.8)`
            : `rgba(${theme === 'light' ? '0, 0, 0' : theme === 'dark' ? '255, 255, 255' : theme === 'macaron' ? '76, 29, 149' : theme === 'cyber' ? '8, 10, 20' : '0, 0, 0'}, 0.5)`,
          borderRadius: '50%',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: LIVE2D.BUTTON_Z_INDEX,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          transition: 'background-color 0.2s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Expand className={`h-5 w-5 transition-transform ${isDragging ? 'rotate-45' : ''}`} />
      </div>
    </div>
  )
}

export default Live2DWidget
