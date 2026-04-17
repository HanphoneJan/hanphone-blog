'use client'

import { useState, useRef, useCallback } from 'react'
import Compressor from 'compressorjs'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_BLOG_LABELS } from '@/lib/labels'

export function useImageUpload() {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [dialogImageUrl, setDialogImageUrl] = useState('')

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型和大小
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showAlert(ADMIN_BLOG_LABELS.IMAGE_FORMAT)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert(ADMIN_BLOG_LABELS.IMAGE_SIZE)
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // 保存原始文件名（不含扩展名）和扩展名
      const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      const fileExtension = 'jpeg'
      const newFileName = `${originalName}.${fileExtension}`

      // 使用Compressor压缩图片
      new Compressor(file, {
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        mimeType: 'image/jpeg',
        convertSize: 102400,
        success: async compressedResult => {
          try {
            const compressedFile = new File([compressedResult], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            const formData = new FormData()
            formData.append('namespace', 'blog/blogs')
            formData.append('file', compressedFile)

            const response = await apiClient({
              url: ENDPOINTS.FILE.UPLOAD,
              method: 'POST',
              data: formData,
              onUploadProgress: progressEvent => {
                if (progressEvent.total) {
                  const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                  setUploadProgress(percent)
                }
              }
            })

            const data = response.data
            if (data.code === 200) {
              setDialogImageUrl(data.url)
              showAlert(ADMIN_BLOG_LABELS.IMAGE_UPLOAD_SUCCESS)
            } else {
              showAlert(ADMIN_BLOG_LABELS.IMAGE_UPLOAD_FAIL_MSG(data.msg || ''))
            }
          } catch (error) {
            console.error('图片上传错误', error)
            showAlert(ADMIN_BLOG_LABELS.IMAGE_UPLOAD_FAIL)
          } finally {
            setIsUploading(false)
            setUploadProgress(0)
            if (uploadRef.current) uploadRef.current.value = ''
          }
        },
        error: err => {
          console.error('图片压缩失败:', err)
          showAlert(ADMIN_BLOG_LABELS.IMAGE_COMPRESS_FAIL)
          setIsUploading(false)
          setUploadProgress(0)
          if (uploadRef.current) uploadRef.current.value = ''
        }
      })
    } catch (error) {
      console.error('图片处理错误', error)
      showAlert(ADMIN_BLOG_LABELS.IMAGE_PROCESS_FAIL)
      setIsUploading(false)
      setUploadProgress(0)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }, [])

  const handleRemoveImage = useCallback(() => {
    setDialogImageUrl('')
    if (uploadRef.current) uploadRef.current.value = ''
  }, [])

  const resetImage = useCallback(() => {
    setDialogImageUrl('')
    setUploadProgress(0)
    setIsUploading(false)
    if (uploadRef.current) uploadRef.current.value = ''
  }, [])

  return {
    uploadRef,
    uploadProgress,
    isUploading,
    dialogImageUrl,
    setDialogImageUrl,
    handleFileChange,
    handleRemoveImage,
    resetImage
  }
}
