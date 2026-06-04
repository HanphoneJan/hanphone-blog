'use client'

import { BookOpen } from 'lucide-react'

interface EssayEmptyProps {
  isMobile: boolean
}

export function EssayEmpty({ isMobile }: EssayEmptyProps) {
  return (
    <div
      className={`${
        isMobile
          ? 'w-full p-6'
          : 'bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-12 mx-auto max-w-2xl'
      } text-center`}
    >
      <div className="text-[rgb(var(--muted-foreground))] mb-4">
        <BookOpen className="h-12 w-12 mx-auto" />
      </div>
      <p className="text-[rgb(var(--muted-foreground))]">暂无随笔内容</p>
    </div>
  )
}

export default EssayEmpty
