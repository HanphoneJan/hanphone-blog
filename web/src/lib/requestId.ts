'use client'

import { useCallback, useRef } from 'react'

// 生成一次性的幂等请求 ID（UUID 优先，兜底时间戳+随机串）
export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// 幂等键 hook：同一提交在重试时复用同一个 ID，成功后才重置
export function useRequestId() {
  const idRef = useRef<string | null>(null)

  const getId = useCallback(() => {
    if (!idRef.current) {
      idRef.current = createRequestId()
    }
    return idRef.current
  }, [])

  const reset = useCallback(() => {
    idRef.current = null
  }, [])

  return { getId, reset }
}