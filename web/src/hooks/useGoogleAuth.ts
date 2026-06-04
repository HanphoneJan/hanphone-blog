'use client'

import { useEffect, useCallback, useRef } from 'react'

// 全局 SDK 状态，避免重复初始化
let initState: 'idle' | 'loading' | 'done' = 'idle'
let latestCallback: ((credential: string) => void) | null = null

export function useGoogleAuth() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') return
    if (initState !== 'idle') return

    initState = 'loading'

    // 如果 script 已存在（可能是 SSR 或其他方式注入），直接初始化
    if ((window as any).google?.accounts?.id) {
      doInitialize(clientId)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        doInitialize(clientId)
      }
    }
    script.onerror = () => {
      initState = 'idle'
    }
    document.body.appendChild(script)
  }, [clientId])

  const prompt = useCallback((onCredential: (credential: string) => void) => {
    latestCallback = onCredential
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      ;(window as any).google.accounts.id.prompt()
    }
  }, [])

  return { prompt, ready: initState === 'done' }
}

/** 全局只调用一次 initialize */
function doInitialize(clientId: string) {
  if (initState === 'done') return

  ;(window as any).google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: any) => {
      if (latestCallback && response?.credential) {
        latestCallback(response.credential)
      }
    }
  })

  initState = 'done'
}
