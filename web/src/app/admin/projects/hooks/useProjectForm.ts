'use client'

import { useState, useRef, useCallback } from 'react'
import { ProjectFormData, Project } from '../types'
import { validateProjectForm } from '../utils'
import { ENDPOINTS } from '@/lib/api'
import { ADMIN_PROJECT_LABELS } from '@/lib/labels'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import Compressor from 'compressorjs'

import {  API_CODE , IMAGE } from '@/lib/constants'
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

const initialFormData: ProjectFormData = {
  title: '',
  content: '',
  url: '',
  techs: '',
  type: 0
}

export const useProjectForm = (onSuccess: () => void) => {
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData)
  const [dialogImageUrl, setDialogImageUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const uploadRef = useRef<HTMLInputElement>(null)
  const imageUploadRef = useRef<HTMLInputElement>(null)

  // 表单输入变化处理
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setDialogImageUrl('')
  }, [])

  // 图片上传处理 - 带压缩
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = 'jpeg'
    const newFileName = `${originalName}.${fileExtension}`

    return new Promise<void>((resolve, reject) => {
      new Compressor(file, {
        quality: 0.8,
        maxWidth: IMAGE.MAX_WIDTH,
        maxHeight: IMAGE.MAX_HEIGHT,
        mimeType: 'image/jpeg',
        convertSize: 102400,
        success: async (compressedResult) => {
          try {
            setLoading(true)

            const compressedFile = new File([compressedResult], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            const formData = new FormData()
            formData.append('namespace', 'blog/project')
            formData.append('file', compressedFile)

            const data = await fetchData(ENDPOINTS.FILE.UPLOAD, 'POST', formData)
            if (data.url) {
              setDialogImageUrl(data.url)
              showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_SUCCESS)
              resolve()
            } else {
              showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_FAIL)
              reject(new Error('Upload failed'))
            }
          } catch (error) {
            console.error('图片上传出错:', error)
            showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_FAIL)
            reject(error)
          } finally {
            setLoading(false)
            if (uploadRef.current) uploadRef.current.value = ''
          }
        },
        error: (err) => {
          console.error('图片压缩失败:', err)
          showAlert(ADMIN_PROJECT_LABELS.IMAGE_COMPRESS_FAIL)
          setLoading(false)
          if (uploadRef.current) uploadRef.current.value = ''
          reject(err)
        }
      })
    })
  }, [])

  // 处理图片上传（用于编辑现有项目）
  const handleImageFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    projectId: number | null,
    onImageUploaded?: (url: string) => void
  ) => {
    if (!e.target.files?.[0] || !projectId) return

    const file = e.target.files[0]
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = 'jpeg'
    const newFileName = `${originalName}.${fileExtension}`

    new Compressor(file, {
      quality: 0.8,
      maxWidth: IMAGE.MAX_WIDTH,
      maxHeight: IMAGE.MAX_HEIGHT,
      mimeType: 'image/jpeg',
      convertSize: 102400,
      success: async (compressedResult) => {
        try {
          setLoading(true)

          const compressedFile = new File([compressedResult], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })

          const formData = new FormData()
          formData.append('namespace', 'blog/project')
          formData.append('file', compressedFile)

          const data = await fetchData(ENDPOINTS.FILE.UPLOAD, 'POST', formData)
          if (data.url) {
            onImageUploaded?.(data.url)
            showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_SUCCESS)
          } else {
            showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_FAIL)
          }
        } catch (error) {
          console.error('图片上传出错:', error)
          showAlert(ADMIN_PROJECT_LABELS.IMAGE_UPLOAD_FAIL)
        } finally {
          setLoading(false)
          if (imageUploadRef.current) imageUploadRef.current.value = ''
        }
      },
      error: (err) => {
        console.error('图片压缩失败:', err)
        showAlert(ADMIN_PROJECT_LABELS.IMAGE_COMPRESS_FAIL)
        setLoading(false)
        if (imageUploadRef.current) imageUploadRef.current.value = ''
      }
    })
  }, [])

  // 移除图片
  const handleRemoveImage = useCallback(() => {
    setDialogImageUrl('')
  }, [])

  // 发布项目
  const publishProject = useCallback(async () => {
    const validationError = validateProjectForm(formData, dialogImageUrl)
    if (validationError) {
      showAlert(validationError)
      return
    }

    try {
      setLoading(true)
      const projectData: Partial<Project> = {
        pic_url: dialogImageUrl,
        title: formData.title,
        content: formData.content,
        url: formData.url,
        techs: formData.techs,
        type: formData.type,
        recommend: false,
        published: true
      }

      const res = await fetchData(ENDPOINTS.ADMIN.PROJECT, 'POST', { project: projectData })

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_PROJECT_LABELS.PUBLISH_SUCCESS)
        resetForm()
        onSuccess()
      } else {
        showAlert(res.message || ADMIN_PROJECT_LABELS.PUBLISH_FAIL)
      }
    } catch (error) {
      console.error('发布项目出错:', error)
      showAlert(ADMIN_PROJECT_LABELS.PUBLISH_FAIL)
    } finally {
      setLoading(false)
    }
  }, [formData, dialogImageUrl, resetForm, onSuccess])

  return {
    formData,
    dialogImageUrl,
    loading,
    uploadRef,
    imageUploadRef,
    handleInputChange,
    handleFileChange,
    handleImageFileChange,
    handleRemoveImage,
    publishProject,
    resetForm,
    setDialogImageUrl
  }
}
