'use client'

import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/utils'

interface CookieStatus {
  configured: boolean
  updatedAt?: string
  hoursSinceLastRefresh?: number | null
  needsRefresh?: boolean
}

export function useNeteaseCookie() {
  const [status, setStatus] = useState<CookieStatus>({ configured: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const res = await apiClient.get<CookieStatus>('/next-api/admin/music/cookie')
      setStatus(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || '获取状态失败')
    }
  }, [])

  const saveCookie = useCallback(
    async (cookie: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await apiClient.put('/next-api/admin/music/cookie', { cookie })
        await fetchStatus()
        return true
      } catch (err: any) {
        setError(err?.response?.data?.error || '保存失败')
        return false
      } finally {
        setLoading(false)
      }
    },
    [fetchStatus],
  )

  const clearCookie = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.delete('/next-api/admin/music/cookie')
      await fetchStatus()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.error || '清除失败')
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  const refreshCookie = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean; refreshed?: boolean; error?: string }>(
        '/next-api/admin/music/cookie',
      )
      if (!res.data.success) {
        setError(res.data.error || '刷新失败')
        return false
      }
      await fetchStatus()
      return true
    } catch (err: any) {
      setError(err?.response?.data?.error || '刷新失败')
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { status, loading, error, saveCookie, clearCookie, refreshCookie, refresh: fetchStatus }
}
