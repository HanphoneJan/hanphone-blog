'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_PERSONAL_LABELS } from '@/lib/labels'
import {  ASSETS , API_CODE } from '@/lib/constants'
import { UserInfo } from '../types'

export function usePersonal() {
  const { userInfo: globalUserInfo, updateUserInfo } = useUser()

  const [userForm, setUserForm] = useState<UserInfo>({
    id: 0,
    avatar: '',
    nickname: '',
    username: '',
    email: '',
    type: '0'
  })
  const [imageUrl, setImageUrl] = useState<string>(ASSETS.DEFAULT_AVATAR)
  const [loading, setLoading] = useState(false)

  // 同步全局用户信息
  useEffect(() => {
    if (globalUserInfo) {
      const userData = {
        id: Number(globalUserInfo.id) || 0,
        avatar: globalUserInfo.avatar || '',
        nickname: globalUserInfo.nickname || '',
        username: globalUserInfo.username || '',
        email: globalUserInfo.email || '',
        type: globalUserInfo.type || '0'
      }
      setUserForm(userData)
      setImageUrl(globalUserInfo.avatar || ASSETS.DEFAULT_AVATAR)
    }
  }, [globalUserInfo])

  // 处理用户信息表单变化
  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserForm(prev => ({
      ...prev,
      [name]: value || ''
    }))
  }

  // 修改用户信息
  const changeUserInfo = async () => {
    if (!globalUserInfo) return showAlert(ADMIN_PERSONAL_LABELS.USER_INFO_REQUIRED)

    try {
      setLoading(true)
      const res = await apiClient({
        url: ENDPOINTS.ADMIN.USER,
        method: 'POST',
        data: { user: userForm }
      })

      if (res.data.code === API_CODE.SUCCESS) {
        if (updateUserInfo) {
          updateUserInfo(res.data.data)
        }
        showAlert(ADMIN_PERSONAL_LABELS.INFO_UPDATE_SUCCESS)
      } else {
        showAlert(res.data.message || ADMIN_PERSONAL_LABELS.INFO_UPDATE_FAIL)
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      showAlert(ADMIN_PERSONAL_LABELS.INFO_UPDATE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 处理头像上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('namespace', 'blog/user')
    formData.append('file', file)

    try {
      setLoading(true)
      const response = await apiClient({
        url: ENDPOINTS.FILE.UPLOAD,
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.code === API_CODE.SUCCESS) {
        setImageUrl(response.data.url || ASSETS.DEFAULT_AVATAR)
      } else {
        showAlert(ADMIN_PERSONAL_LABELS.AVATAR_UPLOAD_FAIL)
      }
    } catch (error) {
      console.error('上传失败:', error)
      showAlert(ADMIN_PERSONAL_LABELS.AVATAR_UPLOAD_FAIL)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  // 设置头像
  const setAvatar = async () => {
    if (!imageUrl || imageUrl.trim() === '' || !globalUserInfo) {
      return showAlert(ADMIN_PERSONAL_LABELS.AVATAR_REQUIRED)
    }

    try {
      setLoading(true)
      const res = await apiClient({
        url: ENDPOINTS.USER.SET_AVATAR,
        method: 'POST',
        data: {
          pic_url: imageUrl,
          user_id: Number(globalUserInfo.id) || 0
        }
      })

      if (res.data.code === API_CODE.SUCCESS) {
        if (updateUserInfo) {
          updateUserInfo(res.data.data)
        }
        showAlert(ADMIN_PERSONAL_LABELS.AVATAR_UPDATE_SUCCESS)
        return true
      } else {
        showAlert(res.data.message || ADMIN_PERSONAL_LABELS.AVATAR_UPDATE_FAIL)
        return false
      }
    } catch (error) {
      console.error('更新头像失败:', error)
      showAlert(ADMIN_PERSONAL_LABELS.AVATAR_UPDATE_FAIL)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    globalUserInfo,
    userForm,
    imageUrl,
    loading,
    setImageUrl,
    setLoading,
    handleUserInfoChange,
    changeUserInfo,
    handleFileUpload,
    setAvatar
  }
}
