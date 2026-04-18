'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { alertSuccess } from '@/lib/Alert'

interface CopyButtonProps {
  text: string
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      alertSuccess('RSS 链接已复制到剪贴板！')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alertSuccess('RSS 链接已复制到剪贴板！')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap font-medium ${
        copied 
          ? 'bg-[rgb(var(--success))] text-white hover:opacity-90' 
          : 'bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))]'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? '已复制' : '复制链接'}
    </button>
  )
}
