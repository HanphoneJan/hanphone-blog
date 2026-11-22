'use client'

import { useState, useCallback } from 'react'
import { ProjectFormData, Project } from '../types'
import { validateProjectForm } from '../utils'
import { ENDPOINTS } from '@/lib/api'
import { ADMIN_PROJECT_LABELS } from '@/lib/labels'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'

import { API_CODE } from '@/lib/constants'
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
    handleInputChange,
    publishProject,
    resetForm,
    setDialogImageUrl
  }
}
