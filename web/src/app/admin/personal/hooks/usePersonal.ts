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
    setAvatar
  }
}
