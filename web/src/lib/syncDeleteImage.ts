'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * 「删除时同步删除图片」开关
 *
 * 该开关是后台全局偏好（而非每个页面各存一份）：避免在某个页面关掉后，
 * 误以为只对该页面生效，实际却悄悄影响了其它模块的文件回收。
 * 存 localStorage，刷新与跨页面保持一致，默认开启（与后端接口默认值一致）。
 */
export const SYNC_DELETE_IMAGE_KEY = 'admin:syncDeleteImage'

/** 读取开关值，SSR / 存储异常时一律回退为默认开启 */
export function readSyncDeleteImage(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(SYNC_DELETE_IMAGE_KEY)
    if (raw === null) return true
    return raw !== 'false'
  } catch {
    return true
  }
}

export function writeSyncDeleteImage(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SYNC_DELETE_IMAGE_KEY, String(enabled))
  } catch {
    // 隐私模式 / 存储写满时忽略，内存态仍然生效
  }
}

/** 给删除接口拼上 syncDeleteImage 查询参数 */
export function withSyncDeleteImage(url: string, enabled: boolean): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}syncDeleteImage=${enabled ? 'true' : 'false'}`
}

/**
 * 读写「删除时同步删除图片」开关
 * @returns 开关当前值、设置函数与切换函数
 */
export function useSyncDeleteImage() {
  const [syncDeleteImage, setSyncDeleteImage] = useState(true)

  // 挂载后再读 localStorage：服务端渲染与首次渲染保持一致，避免 hydration 不匹配
  useEffect(() => {
    setSyncDeleteImage(readSyncDeleteImage())
  }, [])

  // 多标签页同步：一个页面改了开关，其他页面跟着变
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SYNC_DELETE_IMAGE_KEY) {
        setSyncDeleteImage(readSyncDeleteImage())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const updateSyncDeleteImage = useCallback((enabled: boolean) => {
    setSyncDeleteImage(enabled)
    writeSyncDeleteImage(enabled)
  }, [])

  const toggleSyncDeleteImage = useCallback(() => {
    setSyncDeleteImage(prev => {
      writeSyncDeleteImage(!prev)
      return !prev
    })
  }, [])

  return { syncDeleteImage, setSyncDeleteImage: updateSyncDeleteImage, toggleSyncDeleteImage }
}