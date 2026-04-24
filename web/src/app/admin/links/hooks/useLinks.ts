'use client'

import { useState, useEffect, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import {  ASSETS , API_CODE } from '@/lib/constants'
import { ADMIN_LINK_LABELS } from '@/lib/labels'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import type { FriendLink, ParsedApplyText } from '../types'

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

export function useLinks() {
  const [friendLinkList, setFriendLinkList] = useState<FriendLink[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [updateRecommendLoading, setUpdateRecommendLoading] = useState<number | null>(null)
  const [updatePublishedLoading, setUpdatePublishedLoading] = useState<number | null>(null)
  const [parsingLoading, setParsingLoading] = useState<number | null>(null)

  // 处理友链数据，添加默认值和编辑状态
  const processFriendLinkData = (data: any[]): FriendLink[] => {
    return data.map((item: any) => ({
      ...item,
      name: item.name || '未命名友链',
      type: item.type || 'other',
      description: item.description || '暂无描述',
      url: item.url || '',
      avatar: item.avatar || ASSETS.DEFAULT_AVATAR,
      siteshot: item.siteshot || '',
      rss: item.rss || '',
      nickname: item.nickname || '',
      color: item.color || '#1890ff',
      recommend: item.recommend || false,
      published: item.published ?? false,
      applyText: item.applyText || '',
      createTime: item.createTime || new Date().toISOString(),
      inputVisible: false,
      inputValue: '',
      editingName: false,
      editingDescription: false,
      editingAvatar: false,
      editingSiteshot: false,
      editingRss: false,
      editingNickname: false,
      editingUrl: false,
      editingColor: false,
      tempName: item.name || '未命名友链',
      tempDescription: item.description || '暂无描述',
      tempAvatar: item.avatar || ASSETS.DEFAULT_AVATAR,
      tempSiteshot: item.siteshot || '',
      tempRss: item.rss || '',
      tempNickname: item.nickname || '',
      tempUrl: item.url || '',
      tempColor: item.color || '#1890ff'
    }))
  }

  // 获取友链列表
  const getFriendLinkList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.FRIENDLINKS)

      if (res.code === API_CODE.SUCCESS) {
        const processedData = processFriendLinkData(res.data)
        setFriendLinkList(processedData)
        return processedData
      } else {
        showAlert(ADMIN_LINK_LABELS.FETCH_LIST_FAIL)
        return []
      }
    } catch (error) {
      console.error('获取友链列表出错:', error)
      showAlert(ADMIN_LINK_LABELS.FETCH_LIST_FAIL)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // 组件挂载时获取友链列表
  useEffect(() => {
    getFriendLinkList()
  }, [getFriendLinkList])

  // 发布友链
  const publishFriendLink = async (friendLinkData: FriendLink) => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.FRIENDLINK, 'POST', {
        friendLink: friendLinkData
      })

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_LINK_LABELS.PUBLISH_SUCCESS)
        await getFriendLinkList()
        return true
      } else {
        showAlert(res.message || ADMIN_LINK_LABELS.PUBLISH_FAIL)
        return false
      }
    } catch (error) {
      console.error('发布友链出错:', error)
      showAlert(ADMIN_LINK_LABELS.PUBLISH_FAIL)
      return false
    } finally {
      setLoading(false)
    }
  }

  // 更新友链
  const updateFriendLink = async (updatedFriendLink: FriendLink) => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.FRIENDLINK, 'POST', {
        friendLink: updatedFriendLink
      })

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_LINK_LABELS.UPDATE_SUCCESS)
        return true
      } else {
        showAlert(res.message || ADMIN_LINK_LABELS.UPDATE_FAIL)
        await getFriendLinkList()
        return false
      }
    } catch (error) {
      console.error('更新友链出错:', error)
      showAlert(ADMIN_LINK_LABELS.UPDATE_FAIL)
      await getFriendLinkList()
      return false
    } finally {
      setLoading(false)
    }
  }

  // 删除友链
  const deleteFriendLink = async (id: number) => {
    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.ADMIN.FRIENDLINK}/${id}`, 'DELETE')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_LINK_LABELS.DELETE_SUCCESS)
        await getFriendLinkList()
        return true
      } else {
        showAlert(res.message || ADMIN_LINK_LABELS.DELETE_FAIL)
        return false
      }
    } catch (error) {
      console.error('删除友链出错:', error)
      showAlert(ADMIN_LINK_LABELS.DELETE_FAIL)
      return false
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  // 更新友链类型
  const handleTypeChange = async (friendLinkId: number | null, type: string) => {
    if (!friendLinkId) return

    const updatedList = friendLinkList.map(item =>
      item.id === friendLinkId ? { ...item, type } : item
    )
    setFriendLinkList(updatedList)

    const updatedFriendLink = updatedList.find(item => item.id === friendLinkId)
    if (updatedFriendLink) {
      await updateFriendLink(updatedFriendLink)
    }
  }

  // 切换推荐状态
  const toggleRecommend = async (friendLink: FriendLink) => {
    try {
      setUpdateRecommendLoading(friendLink.id)

      const response = await fetchData(ENDPOINTS.ADMIN.FRIENDLINK_RECOMMEND, 'POST', {
        friendLinkId: friendLink.id,
        recommend: !friendLink.recommend
      })

      if (response.code === API_CODE.SUCCESS) {
        setFriendLinkList(prev =>
          prev.map(item =>
            item.id === friendLink.id ? { ...item, recommend: !friendLink.recommend } : item
          )
        )
        showAlert(friendLink.recommend ? ADMIN_LINK_LABELS.UNRECOMMEND_SUCCESS : ADMIN_LINK_LABELS.RECOMMEND_SUCCESS)
        return true
      } else {
        showAlert(friendLink.recommend ? ADMIN_LINK_LABELS.UNRECOMMEND_FAIL : ADMIN_LINK_LABELS.RECOMMEND_FAIL)
        return false
      }
    } catch (error) {
      console.error('推荐状态更新失败:', error)
      showAlert(ADMIN_LINK_LABELS.OPERATION_FAIL)
      return false
    } finally {
      setUpdateRecommendLoading(null)
    }
  }

  // 切换发布状态（审核）
  const togglePublished = async (friendLink: FriendLink) => {
    try {
      setUpdatePublishedLoading(friendLink.id)

      const response = await fetchData(ENDPOINTS.ADMIN.FRIENDLINK_PUBLISHED, 'POST', {
        friendLinkId: friendLink.id,
        published: !friendLink.published
      })

      if (response.code === API_CODE.SUCCESS) {
        setFriendLinkList(prev =>
          prev.map(item =>
            item.id === friendLink.id ? { ...item, published: !friendLink.published } : item
          )
        )
        showAlert(friendLink.published ? '已取消发布' : '已审核发布')
        return true
      } else {
        showAlert('操作失败')
        return false
      }
    } catch (error) {
      console.error('发布状态更新失败:', error)
      showAlert('操作失败')
      return false
    } finally {
      setUpdatePublishedLoading(null)
    }
  }

  // 解析applyText
  const parseApplyText = async (friendLink: FriendLink): Promise<ParsedApplyText | null> => {
    if (!friendLink.applyText) {
      showAlert('没有可解析的申请文本')
      return null
    }

    try {
      setParsingLoading(friendLink.id)

      const response = await fetchData(ENDPOINTS.ADMIN.FRIENDLINK_PARSE, 'POST', {
        applyText: friendLink.applyText
      })

      if (response.code === API_CODE.SUCCESS && response.data) {
        showAlert('解析成功')
        return response.data as ParsedApplyText
      } else {
        showAlert(response.message || '解析失败')
        return null
      }
    } catch (error) {
      console.error('解析失败:', error)
      showAlert('解析失败')
      return null
    } finally {
      setParsingLoading(null)
    }
  }

  // 应用解析结果到友链
  const applyParsedData = async (friendLink: FriendLink, parsedData: ParsedApplyText) => {
    const updatedFriendLink: FriendLink = {
      ...friendLink,
      name: parsedData.name || friendLink.name,
      description: parsedData.description || friendLink.description,
      url: parsedData.url || friendLink.url,
      avatar: parsedData.avatar || friendLink.avatar,
      siteshot: parsedData.siteshot || friendLink.siteshot,
      rss: parsedData.rss || friendLink.rss,
      nickname: parsedData.nickname || friendLink.nickname,
      color: parsedData.color || friendLink.color
    }

    const success = await updateFriendLink(updatedFriendLink)
    if (success) {
      setFriendLinkList(prev =>
        prev.map(item =>
          item.id === friendLink.id ? updatedFriendLink : item
        )
      )
    }
    return success
  }

  // 更新本地友链列表状态
  const updateLocalList = (updater: (list: FriendLink[]) => FriendLink[]) => {
    setFriendLinkList(prev => updater(prev))
  }

  return {
    friendLinkList,
    loading,
    deleteConfirm,
    updateRecommendLoading,
    updatePublishedLoading,
    parsingLoading,
    setDeleteConfirm,
    getFriendLinkList,
    publishFriendLink,
    updateFriendLink,
    deleteFriendLink,
    handleTypeChange,
    toggleRecommend,
    togglePublished,
    parseApplyText,
    applyParsedData,
    updateLocalList
  }
}
