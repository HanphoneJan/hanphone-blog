'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

const WIDTH_CLASS = {
  md: 'max-w-xl',
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl'
} as const

type PageWidth = keyof typeof WIDTH_CLASS

interface PageShellProps {
  children: ReactNode
  width?: PageWidth
  className?: string
}

/**
 * 站内页面统一外壳。
 *
 * 背景组件 BackgroundImage 的遮罩是 `fixed inset-0 z-[1]`，白昼主题下不透明度高达 90%。
 * 页面内容必须位于 `relative z-10` 容器内，否则整页会被遮罩盖住（能点但看不见）。
 * 这里统一处理，避免每个页面各自漏写。
 */
export function PageShell({ children, width = '3xl', className = '' }: PageShellProps) {
  return (
    <div className="relative z-10 min-h-[calc(100dvh-3.5rem)] bg-[rgb(var(--bg)/0.8)]">
      <main className={`mx-auto w-full ${WIDTH_CLASS[width]} px-3 py-8 sm:px-4 ${className}`}>
        {children}
      </main>
    </div>
  )
}

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** 页面标题区：图标 + 标题 + 说明，右侧放主操作 */
export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[rgb(var(--text))]">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

interface LoginRequiredProps {
  icon: LucideIcon
  message: string
  /** 登录态从 localStorage 恢复前展示的骨架，避免闪一下登录引导 */
  skeleton?: ReactNode
  children: ReactNode
}

/** 登录门槛：mounted 前显示骨架，未登录显示登录引导，登录后渲染内容 */
export function LoginRequired({
  icon: Icon,
  message,
  skeleton = null,
  children
}: LoginRequiredProps) {
  const { userInfo, token, onShowLogin } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <>{skeleton}</>

  if (!userInfo || !token) {
    return (
      <div className="py-16 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
          <Icon className="h-7 w-7 text-[rgb(var(--text-muted))]" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm text-[rgb(var(--text-muted))]">{message}</p>
        <button
          type="button"
          onClick={onShowLogin}
          className="mt-4 rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm text-white hover:bg-[rgb(var(--primary-hover))]"
        >
          去登录
        </button>
      </div>
    )
  }

  return <>{children}</>
}

/** 列表页通用骨架屏 */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="加载中">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4"
        >
          <div className="h-4 w-1/3 rounded bg-[rgb(var(--border))]" />
          <div className="mt-3 h-3 w-full rounded bg-[rgb(var(--border))]/70" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[rgb(var(--border))]/70" />
        </div>
      ))}
    </div>
  )
}
