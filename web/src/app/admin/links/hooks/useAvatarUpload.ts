'use client'

import { useState, useRef, useCallback } from 'react'
import Compressor from 'compressorjs'
import { ENDPOINTS } from '@/lib/api'
import { ADMIN_LINK_LABELS } from '@/lib/labels'
import { showAlert } from '@/lib/Alert'
import apiClient from '@/lib/utils'

import { IMAGE } from '@/lib/constants'
// API调用函数
const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
  try {
    const response = await apiClient({
      url,
      method,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined
    })
    return response.data
  } catch (error) {
    console.log(`Error fetching ${url}:`, error)
    return { code: 500, data: null }
  }
}

interface UseAvatarUploadProps {
  onUploadSuccess?: (url: string) => void
  setLoading?: (loading: boolean) => void
}

export function useAvatarUpload({ onUploadSuccess, setLoading }: UseAvatarUploadProps = {}) {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [dialogImageUrl, setDialogImageUrl] = useState('')
  const [avatarInputMode, setAvatarInputMode] = useState<'upload' | 'url'>('upload')
  const uploadRef = useRef<HTMLInputElement>(null)
  const imageUploadRef = useRef<HTMLInputElement>(null)

  // 切换头像输入模式
  const toggleAvatarInputMode = useCallback((mode: 'upload' | 'url') => {
    setAvatarInputMode(mode)
    if (mode === 'upload') {
      setDialogImageUrl('')
      setAvatarUrl('')
    } else {
      setDialogImageUrl(avatarUrl)
    }
  }, [avatarUrl])

  // 头像URL输入变化处理
  const handleAvatarUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAvatarUrl(value)
    setDialogImageUrl(value)
  }, [])

  // 移除图片
  const handleRemoveImage = useCallback(() => {
    setDialogImageUrl('')
    setAvatarUrl('')
  }, [])

  // 上传图片
  const uploadImage = useCallback(async (file: File, friendLinkId?: number | null): Promise<string | null> => {
    // 保存原始文件名（不含扩展名）和扩展名
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = 'jpeg' // 统一使用jpeg扩展名
    const newFileName = `${originalName}.${fileExtension}`

    return new Promise((resolve) => {
      new Compressor(file, {
        quality: 0.8, // 压缩质量，0-1之间
        maxWidth: IMAGE.MAX_WIDTH,
        maxHeight: IMAGE.MAX_HEIGHT,
        mimeType: 'image/jpeg', // 确保MIME类型正确
        convertSize: 102400, // 小于100KB的图片也进行转换
        success: async (compressedResult) => {
          try {
            setLoading?.(true)

            // 将压缩后的blob转换为File对象，并保持原始文件名（修改扩展名为jpeg）
            const compressedFile = new File([compressedResult], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            const formData = new FormData()
            formData.append('namespace', 'blog/friendlink')
            formData.append('file', compressedFile)

            const data = await fetchData(ENDPOINTS.FILE.UPLOAD, 'POST', formData)
            if (data.url) {
              setDialogImageUrl(data.url)
              onUploadSuccess?.(data.url)
              showAlert(ADMIN_LINK_LABELS.IMAGE_UPLOAD_SUCCESS)
              resolve(data.url)
            } else {
              showAlert(ADMIN_LINK_LABELS.IMAGE_UPLOAD_FAIL)
              resolve(null)
            }
          } catch (error) {
            console.error('图片上传出错:', error)
            showAlert(ADMIN_LINK_LABELS.IMAGE_UPLOAD_FAIL)
            resolve(null)
          } finally {
            setLoading?.(false)
            if (uploadRef.current) uploadRef.current.value = ''
            if (imageUploadRef.current) imageUploadRef.current.value = ''
          }
        },
        error: (err) => {
          console.error('图片压缩失败:', err)
          showAlert(ADMIN_LINK_LABELS.IMAGE_COMPRESS_FAIL)
          setLoading?.(false)
          if (uploadRef.current) uploadRef.current.value = ''
          if (imageUploadRef.current) imageUploadRef.current.value = ''
          resolve(null)
        }
      })
    })
  }, [onUploadSuccess, setLoading])

  // 处理文件选择
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    await uploadImage(file)
  }, [uploadImage])

  // 处理行内编辑时的图片上传
  const handleImageFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    friendLinkId: number | null,
    onSuccess?: (url: string) => void
  ) => {
    if (!e.target.files?.[0] || !friendLinkId) return
    const file = e.target.files[0]
    const url = await uploadImage(file, friendLinkId)
    if (url && onSuccess) {
      onSuccess(url)
    }
  }, [uploadImage])

  return {
    avatarUrl,
    dialogImageUrl,
    avatarInputMode,
    uploadRef,
    imageUploadRef,
    toggleAvatarInputMode,
    handleAvatarUrlChange,
    handleRemoveImage,
    handleFileChange,
    handleImageFileChange,
    setDialogImageUrl,
    setAvatarUrl
  }
}
