'use client'

import React from 'react'
import { Menu, X } from 'lucide-react'
import CircularProgress from './ReadingProgress'
import ModalOverlay from '@/components/shared/ModalOverlay'
import type { Heading } from '../types'

import { Z_INDEX } from '@/lib/constants'
interface MobileTocProps {
  headings: Heading[]
  activeHeading: string
  sidebarOpen: boolean
  readingProgress: number
  headerHeight: number
  onToggleSidebar: () => void
  onHeadingClick: (id: string) => void
}

function MobileToc({
  headings,
  activeHeading,
  sidebarOpen,
  readingProgress,
  headerHeight,
  onToggleSidebar,
  onHeadingClick
}: MobileTocProps) {
  if (headings.length === 0) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onToggleSidebar}
      >
        <ModalOverlay opacity={0.4} blur={false} />
      </div>

      {/* 侧边栏 */}
      <div
        className={`
        fixed z-40 right-0 text-[rgb(var(--text))] w-64
        shadow-sm bg-[rgb(var(--bg))] backdrop-blur-sm border-l border-[rgb(var(--border))]
        transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        <div className="p-4 flex justify-between items-center blog-toc-header">
          <h3 className="blog-text-lg font-bold text-[rgb(var(--text))]">目录</h3>
          <button
            onClick={onToggleSidebar}
            className="text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] p-1 lg:hidden"
            aria-label="关闭目录"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="sidebar-container blog-nav-prose h-[calc(100%-3rem)] overflow-y-auto p-4">
          <nav className="space-y-2">
            {headings.map(heading => (
              <button
                key={heading.originalId}
                data-heading-id={heading.originalId}
                onClick={() => onHeadingClick(heading.originalId)}
                className={`block w-full text-left py-1 px-2 rounded transition-colors ${
                  activeHeading === heading.originalId
                    ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] border border-[rgb(var(--primary)/0.2)]'
                    : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]'
                }`}
                style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 悬浮按钮 */}
      <button
        onClick={onToggleSidebar}
        className="fixed bottom-6 left-6 lg:hidden hover:scale-105 duration-300 rounded-full"
        style={{ zIndex: Z_INDEX.LIVE2D, background: 'rgb(var(--card))', width: '56px', height: '56px', padding: 0 }}
        aria-label="打开目录"
      >
        <CircularProgress progress={readingProgress} size={56} strokeWidth={4}>
          <Menu className="h-6 w-6 text-[rgb(var(--text))]" />
        </CircularProgress>
      </button>
    </>
  )
}

export default MobileToc