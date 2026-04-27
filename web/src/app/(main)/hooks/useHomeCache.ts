/**
 * 首页数据缓存Hook
 */

import { useRef, useCallback } from 'react'
import { HOME_CONFIG } from '@/lib/constants'
import type { CacheItem, ApiResponse } from '../types'

export function useHomeCache() {
  const cacheRef = useRef<Map<string, CacheItem<unknown>>>(new Map())

  /**
   * 从缓存获取数据
   */
  const getFromCache = useCallback(<T,>(key: string): T | null => {
    const cachedItem = cacheRef.current.get(key)
    if (!cachedItem) return null

    // 检查缓存是否过期
    if (Date.now() - cachedItem.timestamp > HOME_CONFIG.CACHE_EXPIRY_MS) {
      cacheRef.current.delete(key)
      return null
    }

    return cachedItem.data as T
  }, [])

  /**
   * 设置缓存数据
   */
  const setCache = useCallback(<T,>(key: string, data: T): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    })
  }, [])

  /**
   * 清除缓存
   */
  const clearCache = useCallback((): void => {
    cacheRef.current.clear()
  }, [])

  /**
   * 删除指定缓存
   */
  const removeCache = useCallback((key: string): void => {
    cacheRef.current.delete(key)
  }, [])

  return {
    getFromCache,
    setCache,
    clearCache,
    removeCache
  }
}
