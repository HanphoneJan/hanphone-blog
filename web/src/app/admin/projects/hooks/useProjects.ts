'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Project, ProjectFilters } from '../types'
import { processProjectData, filterProjects, sortProjects } from '../utils'
import { ENDPOINTS } from '@/lib/api'
import { ADMIN_PROJECT_LABELS, ADMIN_LINK_LABELS } from '@/lib/labels'
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

export const useProjects = () => {
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [updateRecommendLoading, setUpdateRecommendLoading] = useState<number | null>(null)
  const [updatePublishedLoading, setUpdatePublishedLoading] = useState<number | null>(null)

  // 筛选状态
  const [filters, setFilters] = useState<ProjectFilters>({
    type: -1,
    searchQuery: '',
    status: 'all',
    publishStatus: 'all',
    sortBy: 'created',
    sortOrder: 'desc'
  })

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 本地输入状态管理
  const [localInputValues, setLocalInputValues] = useState<{
    [key: number]: {
      title?: string
      content?: string
      imageUrl?: string
      url?: string
      techInput?: string
    }
  }>({})

  // 获取项目列表
  const getProjectList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.PROJECTS)

      if (res.code === API_CODE.SUCCESS) {
        const processedData = processProjectData(res.data)
        setProjectList(processedData)
        setLocalInputValues({})
      } else {
        showAlert(ADMIN_PROJECT_LABELS.FETCH_LIST_FAIL)
      }
    } catch (error) {
      console.error('获取项目列表出错:', error)
      showAlert(ADMIN_PROJECT_LABELS.FETCH_LIST_FAIL)
    } finally {
      setLoading(false)
    }
  }, [])

  // 组件挂载时获取项目列表
  useEffect(() => {
    getProjectList()
  }, [getProjectList])

  // 筛选和排序后的列表
  const filteredList = useMemo(() => {
    const filtered = filterProjects(projectList, {
      type: filters.type,
      searchQuery: filters.searchQuery,
      status: filters.status,
      publishStatus: filters.publishStatus
    })
    return sortProjects(filtered, filters.sortBy, filters.sortOrder)
  }, [projectList, filters])

  // 前端本地分页
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // 筛选变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // 更新项目
  const updateProject = useCallback(async (updatedProject: Project) => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.PROJECT, 'POST', { project: updatedProject })

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_PROJECT_LABELS.UPDATE_SUCCESS)
      } else {
        showAlert(res.message || ADMIN_PROJECT_LABELS.UPDATE_FAIL)
        getProjectList()
      }
    } catch (error) {
      console.error('更新项目出错:', error)
      showAlert(ADMIN_PROJECT_LABELS.UPDATE_FAIL)
      getProjectList()
    } finally {
      setLoading(false)
    }
  }, [getProjectList])

  // 删除项目
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return

    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.ADMIN.PROJECT}/${deleteConfirm}/delete`, 'GET')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_PROJECT_LABELS.DELETE_SUCCESS)
        getProjectList()
      } else {
        showAlert(res.message || ADMIN_PROJECT_LABELS.DELETE_FAIL)
      }
    } catch (error) {
      console.error('删除项目出错:', error)
      showAlert(ADMIN_PROJECT_LABELS.DELETE_FAIL)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, getProjectList])

  // 切换推荐状态
  const toggleRecommend = useCallback(async (project: Project) => {
    try {
      setUpdateRecommendLoading(project.id)

      const response = await fetchData(ENDPOINTS.ADMIN.PROJECT_RECOMMEND, 'POST', {
        projectId: project.id,
        recommend: !project.recommend
      })

      if (response.code === API_CODE.SUCCESS) {
        setProjectList(prev =>
          prev.map(item =>
            item.id === project.id ? { ...item, recommend: !project.recommend } : item
          )
        )
        showAlert(project.recommend ? ADMIN_LINK_LABELS.UNRECOMMEND_SUCCESS : ADMIN_LINK_LABELS.RECOMMEND_SUCCESS)
      } else {
        showAlert(project.recommend ? ADMIN_LINK_LABELS.UNRECOMMEND_FAIL : ADMIN_LINK_LABELS.RECOMMEND_FAIL)
      }
    } catch (error) {
      console.error('推荐状态更新失败:', error)
      showAlert(ADMIN_PROJECT_LABELS.OPERATION_FAIL)
    } finally {
      setUpdateRecommendLoading(null)
    }
  }, [])

  // 切换发布状态
  const togglePublished = useCallback(async (project: Project) => {
    try {
      setUpdatePublishedLoading(project.id)

      const response = await fetchData(ENDPOINTS.ADMIN.PROJECT_PUBLISHED, 'POST', {
        projectId: project.id,
        published: !project.published
      })

      if (response.code === API_CODE.SUCCESS) {
        setProjectList(prev =>
          prev.map(item =>
            item.id === project.id ? { ...item, published: !project.published } : item
          )
        )
        showAlert(project.published ? '取消发布成功' : '发布成功')
      } else {
        showAlert(project.published ? '取消发布失败' : '发布失败')
      }
    } catch (error) {
      console.error('发布状态更新失败:', error)
      showAlert(ADMIN_PROJECT_LABELS.OPERATION_FAIL)
    } finally {
      setUpdatePublishedLoading(null)
    }
  }, [])

  // 更新项目类型
  const handleTypeChange = useCallback((projectId: number | null, type: number) => {
    if (!projectId) return

    setProjectList(prev => {
      const updated = prev.map(item =>
        item.id === projectId ? { ...item, type } : item
      )
      const updatedProject = updated.find(item => item.id === projectId)
      if (updatedProject) {
        updateProject(updatedProject)
      }
      return updated
    })
  }, [updateProject])

  // 本地输入处理
  const handleLocalInputChange = useCallback((projectId: number, field: string, value: string) => {
    setLocalInputValues(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value
      }
    }))
  }, [])

  // 筛选器变化处理
  const handleFilterChange = useCallback((name: keyof ProjectFilters, value: any) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }, [])

  // 重置筛选条件
  const resetFilters = useCallback(() => {
    setFilters({
      type: -1,
      searchQuery: '',
      status: 'all',
      publishStatus: 'all',
      sortBy: 'created',
      sortOrder: 'desc'
    })
  }, [])

  // 编辑状态管理
  const setEditingState = useCallback((projectId: number | null, field: keyof Project, value: boolean) => {
    if (!projectId) return

    setProjectList(prev =>
      prev.map(item =>
        item.id === projectId ? { ...item, [field]: value } : item
      )
    )

    // 初始化本地输入值
    if (value) {
      const project = projectList.find(item => item.id === projectId)
      if (project) {
        setLocalInputValues(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            title: project.title,
            content: project.content,
            imageUrl: project.pic_url,
            url: project.url
          }
        }))
      }
    }
  }, [projectList])

  // 保存编辑
  const saveEdit = useCallback((projectId: number | null, field: 'title' | 'content' | 'imageUrl' | 'url') => {
    if (!projectId) return

    const localValue = localInputValues[projectId]?.[field]
    const projectField = field === 'imageUrl' ? 'pic_url' : field

    setProjectList(prev => {
      const updated = prev.map(item =>
        item.id === projectId
          ? { ...item, [projectField]: localValue || item[projectField as keyof Project], [`editing${field.charAt(0).toUpperCase() + field.slice(1)}`]: false }
          : item
      )
      const updatedProject = updated.find(item => item.id === projectId)
      if (updatedProject) {
        updateProject(updatedProject)
      }
      return updated
    })
  }, [localInputValues, updateProject])

  // 取消编辑
  const cancelEdit = useCallback((projectId: number | null, field: keyof Project) => {
    if (!projectId) return

    setProjectList(prev =>
      prev.map(item =>
        item.id === projectId ? { ...item, [field]: false } : item
      )
    )
  }, [])

  // 技术标签相关
  const showTagInput = useCallback((projectId: number | null) => {
    if (!projectId) return

    setProjectList(prev =>
      prev.map(item =>
        item.id === projectId ? { ...item, inputVisible: true } : item
      )
    )
  }, [])

  const confirmTagInput = useCallback((project: Project) => {
    const projectId = project.id
    if (!projectId) return

    const currentTechs = project.techs || ''
    const inputValue = localInputValues[projectId]?.techInput || ''

    if (!inputValue.trim()) {
      setProjectList(prev =>
        prev.map(item =>
          item.id === projectId
            ? { ...item, inputValue: '', inputVisible: false }
            : item
        )
      )
      return
    }

    const updatedTechs = currentTechs ? `${currentTechs},${inputValue}` : inputValue

    setProjectList(prev => {
      const updated = prev.map(item =>
        item.id === projectId
          ? { ...item, techs: updatedTechs, inputValue: '', inputVisible: false }
          : item
      )
      const projectToUpdate = updated.find(item => item.id === projectId)
      if (projectToUpdate) {
        updateProject(projectToUpdate)
      }
      return updated
    })

    setLocalInputValues(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], techInput: '' }
    }))
  }, [localInputValues, updateProject])

  const removeTag = useCallback((index: number, project: Project) => {
    const currentTechs = project.techs || ''
    if (!currentTechs) return

    const tags = currentTechs.split(',')
    tags.splice(index, 1)
    const updatedTechs = tags.join(',')

    setProjectList(prev => {
      const updated = prev.map(item =>
        item.id === project.id ? { ...item, techs: updatedTechs } : item
      )
      const projectToUpdate = updated.find(item => item.id === project.id)
      if (projectToUpdate) {
        updateProject(projectToUpdate)
      }
      return updated
    })
  }, [updateProject])

  // 分页跳转（确保不超出范围）
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }, [totalPages])

  return {
    projectList,
    filteredList: paginatedList,
    allFilteredList: filteredList,
    loading,
    filters,
    localInputValues,
    deleteConfirm,
    updateRecommendLoading,
    updatePublishedLoading,
    currentPage,
    pageSize,
    totalPages,
    getProjectList,
    setDeleteConfirm,
    handleDeleteConfirm,
    toggleRecommend,
    togglePublished,
    handleTypeChange,
    handleLocalInputChange,
    handleFilterChange,
    resetFilters,
    setEditingState,
    saveEdit,
    cancelEdit,
    showTagInput,
    confirmTagInput,
    removeTag,
    updateProject,
    goToPage
  }
}
