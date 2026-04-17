'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_BLOG_LABELS } from '@/lib/labels'
import type { Blog, QueryInfo } from '../types'

export function useBlogs() {
  const [blogList, setBlogList] = useState<Blog[]>([])
  const [totalcount, setTotalcount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [updateRecommendLoading, setUpdateRecommendLoading] = useState<number | null>(null)
  const [updatePublishedLoading, setUpdatePublishedLoading] = useState<number | null>(null)

  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      setLoading(true)
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })
      setLoading(false)
      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      setLoading(false)
      showAlert(ADMIN_BLOG_LABELS.OPERATION_FAIL)
      return { code: 500, data: null }
    }
  }

  const getBlogList = useCallback(async (queryInfo: QueryInfo, pagenum: number, pagesize: number) => {
    const data = await fetchData(ENDPOINTS.ADMIN.BLOG_LIST, 'POST', {
      title: queryInfo.title,
      typeId: queryInfo.typeId,
      pagenum,
      pagesize
    })

    if (data.code === 200) {
      const formattedBlogs = data.data.content.map((blog: Blog) => ({
        ...blog,
        inputVisible: false,
        inputValue: ''
      }))
      setBlogList(formattedBlogs)
      setTotalcount(data.data.totalElements)
    } else {
      showAlert(ADMIN_BLOG_LABELS.FETCH_LIST_FAIL)
    }
    setLoading(false)
  }, [])

  const removeBlogById = async (id: number, onSuccess?: () => void) => {
    showAlert(ADMIN_BLOG_LABELS.DELETE_CONFIRM, { type: 'warning', duration: 3000 })
    const data = await fetchData(`${ENDPOINTS.ADMIN.BLOGS}/${id}/delete`, 'GET')
    if (data.code === 200) {
      showAlert(ADMIN_BLOG_LABELS.DELETE_SUCCESS)
      onSuccess?.()
    } else {
      showAlert(ADMIN_BLOG_LABELS.DELETE_FAIL)
    }
  }

  const updateBlog = async (blog: Blog, onSuccess?: () => void) => {
    const data = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', { blog })
    if (data.code === 200) {
      onSuccess?.()
      return true
    }
    return false
  }

  const toggleRecommend = async (blog: Blog, onSuccess?: () => void) => {
    try {
      setUpdateRecommendLoading(blog.id)
      const response = await fetchData(ENDPOINTS.ADMIN.BLOG_RECOMMEND, 'POST', {
        blogId: blog.id,
        recommend: !blog.recommend
      })

      if (response.code === 200) {
        onSuccess?.()
        showAlert(blog.recommend ? ADMIN_BLOG_LABELS.UNRECOMMEND_SUCCESS : ADMIN_BLOG_LABELS.RECOMMEND_SUCCESS)
        return true
      } else {
        showAlert(blog.recommend ? ADMIN_BLOG_LABELS.UNRECOMMEND_FAIL : ADMIN_BLOG_LABELS.RECOMMEND_FAIL)
        return false
      }
    } catch (error) {
      console.error('推荐状态更新失败:', error)
      showAlert(ADMIN_BLOG_LABELS.OPERATION_FAIL)
      return false
    } finally {
      setUpdateRecommendLoading(null)
    }
  }

  const togglePublish = async (blog: Blog, onSuccess?: () => void) => {
    try {
      setUpdatePublishedLoading(blog.id)
      const response = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', {
        blog: { ...blog, published: !blog.published }
      })

      if (response.code === 200) {
        onSuccess?.()
        showAlert(blog.published ? ADMIN_BLOG_LABELS.UNPUBLISH_SUCCESS : ADMIN_BLOG_LABELS.PUBLISH_SUCCESS)
        return true
      } else {
        showAlert(blog.published ? ADMIN_BLOG_LABELS.UNPUBLISH_FAIL : ADMIN_BLOG_LABELS.PUBLISH_FAIL)
        return false
      }
    } catch (error) {
      console.error('发布状态更新失败:', error)
      showAlert(ADMIN_BLOG_LABELS.OPERATION_FAIL)
      return false
    } finally {
      setUpdatePublishedLoading(null)
    }
  }

  const updateBlogField = async (blog: Blog, field: Partial<Blog>, successMsg: string, failMsg: string, onSuccess?: () => void) => {
    const updatedBlog = { ...blog, ...field }
    const data = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', { blog: updatedBlog })
    if (data.code === 200) {
      showAlert(successMsg)
      onSuccess?.()
      return true
    } else {
      showAlert(failMsg)
      return false
    }
  }

  return {
    blogList,
    setBlogList,
    totalcount,
    loading,
    updateRecommendLoading,
    updatePublishedLoading,
    getBlogList,
    removeBlogById,
    updateBlog,
    toggleRecommend,
    togglePublish,
    updateBlogField
  }
}
