'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_ESSAY_LABELS } from '@/lib/labels'
import type { FileType, EssayFile, FileInfo, FileToDelete } from '../types'
import { getFileType, MAX_FILE_COUNT } from '../utils'

export function useEssayFiles(
  fetchData: (url: string, method?: string, data?: unknown) => Promise<{ code: number; data?: { url: string }; message?: string }>
) {
  const [localFiles, setLocalFiles] = useState<FileInfo[]>([])
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileToDelete | null>(null)

  // 文件选择处理
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    uploadedFileCount: number
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 计算已有的文件总数
    const existingCount = localFiles.length + uploadedFileCount

    // 检查是否超过最大数量
    const remaining = MAX_FILE_COUNT - existingCount
    if (files.length > remaining) {
      showAlert(ADMIN_ESSAY_LABELS.MAX_FILES_MSG(MAX_FILE_COUNT, remaining))
      return
    }

    // 处理选择的文件，生成预览
    Array.from(files).forEach(file => {
      const type = getFileType(file)
      const reader = new FileReader()

      reader.onload = event => {
        setLocalFiles(prev => [
          ...prev,
          {
            file,
            previewUrl: event.target?.result as string,
            type
          }
        ])
      }

      // 根据文件类型选择合适的读取方式
      if (type === 'IMAGE' || type === 'VIDEO') {
        reader.readAsDataURL(file)
      } else {
        // 文本文件不需要预览，使用空字符串
        reader.readAsDataURL(new Blob(['']))
      }
    })

    // 清空input值，允许重复选择同一文件
    e.target.value = ''
  }, [localFiles.length])

  // 打开文件删除确认框
  const openFileDeleteModal = useCallback((index: number, isLocal: boolean, fileName: string) => {
    setFileToDelete({ index, isLocal, fileName })
    setDeleteFileModalVisible(true)
  }, [])

  // 关闭文件删除确认框
  const closeFileDeleteModal = useCallback(() => {
    setDeleteFileModalVisible(false)
    setFileToDelete(null)
  }, [])

  // 移除本地文件（未上传的）
  const removeLocalFile = useCallback((index: number) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 移除已上传的文件（服务器删除）
  const removeUploadedFile = useCallback(async (index: number, files: EssayFile[]): Promise<boolean> => {
    const fileToRemove = files[index]

    try {
      // 从服务器删除文件 - 使用文件名
      if (fileToRemove.id && fileToRemove.name) {
        await fetchData(ENDPOINTS.FILE.DELETE, 'DELETE', {
          name: fileToRemove.name,
          category: 'blog/essay',
          isDirectory: false
        })
      }
      return true
    } catch (error) {
      console.error('文件删除失败:', error)
      showAlert(ADMIN_ESSAY_LABELS.FILE_DELETE_FAIL)
      return true // 即使服务器删除失败，也允许从本地移除
    }
  }, [fetchData])

  // 确认删除文件
  const confirmFileDelete = useCallback(async (onRemoveUploaded: (index: number) => void) => {
    if (!fileToDelete) return false

    const { index, isLocal } = fileToDelete

    if (isLocal) {
      removeLocalFile(index)
    } else {
      onRemoveUploaded(index)
    }

    closeFileDeleteModal()
    return true
  }, [fileToDelete, removeLocalFile, closeFileDeleteModal])

  // 上传单个文件到服务器
  const uploadSingleFile = useCallback(async (file: File, fileType: FileType): Promise<EssayFile | null> => {
    try {
      const formData = new FormData()
      if (!file || !file.name || file.size <= 0) {
        throw new Error('无效的文件')
      }
      formData.append('namespace', 'blog/essay')
      formData.append('file', file)

      const response = await apiClient({
        url: ENDPOINTS.FILE.UPLOAD,
        method: 'POST',
        data: formData
      })

      const data = response.data
      if (response.status === 200) {
        // 创建文件信息对象，包含文件名
        const essayFile: EssayFile = {
          id: 0, // 服务器会分配ID
          url: data.url,
          urlType: fileType,
          urlDesc: null,
          isValid: true,
          createTime: new Date().toISOString(),
          name: file.name // 保存原始文件名
        }
        return essayFile
      } else {
        throw new Error(`文件上传失败: ${data.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      throw error
    }
  }, [])

  // 上传所有本地文件
  const uploadAllFiles = useCallback(async (): Promise<EssayFile[]> => {
    const uploadedFiles: EssayFile[] = []

    for (const localFile of localFiles) {
      try {
        const essayFile = await uploadSingleFile(localFile.file, localFile.type)
        if (essayFile) {
          uploadedFiles.push(essayFile)
        }
      } catch (error) {
        showAlert(ADMIN_ESSAY_LABELS.PARTIAL_UPLOAD_FAIL)
        console.log('上传文件错误' + error)
      }
    }

    return uploadedFiles
  }, [localFiles, uploadSingleFile])

  // 清空本地文件
  const clearLocalFiles = useCallback(() => {
    setLocalFiles([])
  }, [])

  return {
    localFiles,
    deleteFileModalVisible,
    fileToDelete,
    handleFileSelect,
    openFileDeleteModal,
    closeFileDeleteModal,
    confirmFileDelete,
    removeLocalFile,
    removeUploadedFile,
    uploadAllFiles,
    clearLocalFiles
  }
}
