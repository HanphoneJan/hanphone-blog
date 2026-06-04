'use client'

import { useState, useCallback } from 'react'
import type { FriendLink, LocalInputValues } from '../types'

interface UseInlineEditProps {
  friendLinkList: FriendLink[]
  updateLocalList: (updater: (list: FriendLink[]) => FriendLink[]) => void
  updateFriendLink: (friendLink: FriendLink) => Promise<boolean>
}

export function useInlineEdit({
  friendLinkList,
  updateLocalList,
  updateFriendLink
}: UseInlineEditProps) {
  const [localInputValues, setLocalInputValues] = useState<LocalInputValues>({})

  // 本地输入处理函数
  const handleLocalInputChange = useCallback((friendLinkId: number, field: string, value: string) => {
    setLocalInputValues(prev => ({
      ...prev,
      [friendLinkId]: {
        ...prev[friendLinkId],
        [field]: value
      }
    }))
  }, [])

  // 开始编辑
  const startEdit = useCallback((friendLinkId: number | null, field: keyof FriendLink, valueField: string) => {
    if (!friendLinkId) return
    const friendLink = friendLinkList.find(item => item.id === friendLinkId)
    if (!friendLink) return

    updateLocalList(prev =>
      prev.map(item =>
        item.id === friendLinkId ? { ...item, [field]: true } : item
      )
    )

    // 初始化本地输入值
    setLocalInputValues(prev => ({
      ...prev,
      [friendLinkId]: {
        ...prev[friendLinkId],
        [valueField]: (friendLink as any)[valueField]
      }
    }))
  }, [friendLinkList, updateLocalList])

  // 保存编辑
  const saveEdit = useCallback(async (
    friendLinkId: number | null,
    field: keyof FriendLink,
    valueField: string,
    editingField: keyof FriendLink
  ) => {
    if (!friendLinkId) return
    const localValue = localInputValues[friendLinkId]?.[valueField as keyof typeof localInputValues[number]]

    updateLocalList(prev =>
      prev.map(item =>
        item.id === friendLinkId
          ? { ...item, [field]: localValue !== undefined ? localValue : (item as any)[field], [editingField]: false }
          : item
      )
    )

    const updatedFriendLink = friendLinkList.find(item => item.id === friendLinkId)
    if (updatedFriendLink) {
      const newValue = localValue !== undefined ? localValue : (updatedFriendLink as any)[field]
      await updateFriendLink({ ...updatedFriendLink, [field]: newValue })
    }
  }, [localInputValues, friendLinkList, updateLocalList, updateFriendLink])

  // 取消编辑
  const cancelEdit = useCallback((friendLinkId: number | null, editingField: keyof FriendLink) => {
    updateLocalList(prev =>
      prev.map(item =>
        item.id === friendLinkId ? { ...item, [editingField]: false } : item
      )
    )
  }, [updateLocalList])

  // 编辑名称
  const handleEditName = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingName', 'name')
  }, [startEdit])

  const handleSaveName = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'name', 'name', 'editingName')
  }, [saveEdit])

  const handleCancelEditName = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingName')
  }, [cancelEdit])

  // 编辑描述
  const handleEditDescription = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingDescription', 'description')
  }, [startEdit])

  const handleSaveDescription = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'description', 'description', 'editingDescription')
  }, [saveEdit])

  const handleCancelEditDescription = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingDescription')
  }, [cancelEdit])

  // 编辑头像
  const handleEditAvatar = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingAvatar', 'avatar')
  }, [startEdit])

  const handleSaveAvatar = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'avatar', 'avatar', 'editingAvatar')
  }, [saveEdit])

  const handleCancelEditAvatar = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingAvatar')
  }, [cancelEdit])

  // 编辑站点截图
  const handleEditSiteshot = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingSiteshot', 'siteshot')
  }, [startEdit])

  const handleSaveSiteshot = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'siteshot', 'siteshot', 'editingSiteshot')
  }, [saveEdit])

  const handleCancelEditSiteshot = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingSiteshot')
  }, [cancelEdit])

  // 编辑RSS
  const handleEditRss = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingRss', 'rss')
  }, [startEdit])

  const handleSaveRss = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'rss', 'rss', 'editingRss')
  }, [saveEdit])

  const handleCancelEditRss = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingRss')
  }, [cancelEdit])

  // 编辑昵称
  const handleEditNickname = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingNickname', 'nickname')
  }, [startEdit])

  const handleSaveNickname = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'nickname', 'nickname', 'editingNickname')
  }, [saveEdit])

  const handleCancelEditNickname = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingNickname')
  }, [cancelEdit])

  // 编辑链接
  const handleEditUrl = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingUrl', 'url')
  }, [startEdit])

  const handleSaveUrl = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'url', 'url', 'editingUrl')
  }, [saveEdit])

  const handleCancelEditUrl = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingUrl')
  }, [cancelEdit])

  // 编辑颜色
  const handleEditColor = useCallback((friendLinkId: number | null) => {
    startEdit(friendLinkId, 'editingColor', 'color')
  }, [startEdit])

  const handleSaveColor = useCallback((friendLinkId: number | null) => {
    saveEdit(friendLinkId, 'color', 'color', 'editingColor')
  }, [saveEdit])

  const handleCancelEditColor = useCallback((friendLinkId: number | null) => {
    cancelEdit(friendLinkId, 'editingColor')
  }, [cancelEdit])

  return {
    localInputValues,
    handleLocalInputChange,
    handleEditName,
    handleSaveName,
    handleCancelEditName,
    handleEditDescription,
    handleSaveDescription,
    handleCancelEditDescription,
    handleEditAvatar,
    handleSaveAvatar,
    handleCancelEditAvatar,
    handleEditSiteshot,
    handleSaveSiteshot,
    handleCancelEditSiteshot,
    handleEditRss,
    handleSaveRss,
    handleCancelEditRss,
    handleEditNickname,
    handleSaveNickname,
    handleCancelEditNickname,
    handleEditUrl,
    handleSaveUrl,
    handleCancelEditUrl,
    handleEditColor,
    handleSaveColor,
    handleCancelEditColor
  }
}
