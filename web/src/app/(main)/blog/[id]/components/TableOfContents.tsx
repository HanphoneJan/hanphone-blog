'use client'

import React from 'react'
import type { Heading } from '../types'

interface TableOfContentsProps {
  headings: Heading[]
  activeHeading: string
  onHeadingClick: (id: string) => void
}

function TableOfContents({ headings, activeHeading, onHeadingClick }: TableOfContentsProps) {
  if (headings.length === 0) return null

  return (
    <div className="sidebar-container blog-nav-prose max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="blog-text-lg text-[rgb(var(--text-muted))] tracking-wider mb-3">本文导航</div>
      <nav className="space-y-0.5">
        {headings.map((heading) => (
          <button
            key={heading.originalId}
            data-heading-id={heading.originalId}
            onClick={() => onHeadingClick(heading.originalId)}
            className={`block w-full text-left py-1 blog-text-base leading-snug transition-colors ${
              activeHeading === heading.originalId
                ? 'text-[rgb(var(--primary))] font-medium'
                : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))]'
            }`}
            style={{ paddingLeft: `${(heading.level - 1) * 12 + 0}px` }}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default TableOfContents
