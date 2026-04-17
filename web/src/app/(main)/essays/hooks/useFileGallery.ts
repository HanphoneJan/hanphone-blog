'use client'

import { useMemo, useState, useCallback } from 'react'
import { getFileType, getFileName } from '../utils'
import type { Essay, FileType } from '../types'

export function useFileGallery() {
  const [zoomData, setZoomData] = useState<{
    visible: boolean
    url: string
    type: FileType
  }>({ visible: false, url: '', type: 'image' })

  // 打开文件
  const openFile = useCallback((url: string) => {
    const fileType = getFileType(url)

    if (fileType === 'text') {
      const a = document.createElement('a')
      a.href = url
      a.download = getFileName(url)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else if (fileType === 'image') {
      setZoomData({ visible: true, url, type: fileType })
    }
  }, [])

  // 关闭放大弹窗
  const closeZoom = useCallback(() => {
    setZoomData(prev => ({ ...prev, visible: false }))
  }, [])

  return {
    zoomData,
    openFile,
    closeZoom
  }
}
