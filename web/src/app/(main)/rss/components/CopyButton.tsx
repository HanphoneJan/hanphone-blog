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
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors whitespace-nowrap ${
        copied ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? '已复制' : '复制链接'}
    </button>
  )
}
