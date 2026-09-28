'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import type { Variants } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * 页面切换容器。
 *
 * 历史实现用 framer-motion 的 `AnimatePresence mode="wait"` + `initial={opacity:0}`，
 * 首次路由进入时若 enter 动画被中断/失败（快速连续导航、后台标签页等），
 * 页面会永远停在 opacity:0 —— 整页空白但 DOM 完整、可点击（opacity 不阻断命中）。
 *
 * 现改为纯 CSS keyframes 入场动画：
 *  - `forwards` 保证动画终态为 opacity:1；
 *  - 即使动画因任何原因未运行，元素默认 opacity 也为 1；
 *  - 因此页面从机制上不可能停留在"透明空白"状态。
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  )
}

// 内容淡入动画变体
export const contentVariants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}

// 列表项交错动画变体
export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

// 卡片动画变体
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.96
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.3
    }
  }
}

// 骨架屏淡出变体
export const skeletonVariants: Variants = {
  initial: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.4,
      ease: 'easeInOut'
    }
  }
}

// 缩放动画变体
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}