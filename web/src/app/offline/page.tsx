'use client'

import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[rgb(var(--bg))] text-[rgb(var(--text))] p-6">
      <WifiOff className="w-20 h-20 text-[rgb(var(--muted-foreground))] mb-6" />
      <h1 className="text-2xl font-bold mb-2">网络已断开</h1>
      <p className="text-[rgb(var(--text-muted))] mb-6 text-center max-w-md">
        您正处于离线状态，请检查网络连接后重试。
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-lg bg-[rgb(var(--primary))] text-white hover:opacity-90 transition-opacity"
      >
        重新加载
      </Link>
    </div>
  )
}
