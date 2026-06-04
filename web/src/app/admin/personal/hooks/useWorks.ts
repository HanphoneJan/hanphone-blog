'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { Work, Item, PersonInfoFormData } from '../types'

import { API_CODE } from '@/lib/constants'
export function useWorks() {
  const [works, setWorks] = useState<Work[]>([])

  const processWorksData = useCallback((data: Item[]) => {
    const worksData = data.filter((item: Item) => item.category === 'work')
    const processed = worksData
      .map((item: Item) => ({
        id: item.id,
        name: item.name,
        url: item.url || '',
        desc: item.description || '',
        pic_url: item.pic_url || '',
        icon_src: item.icon_src || '',
        icon: null, // 图标在组件中渲染
        rank: item.rank || 0
      }))
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank
        }
        return a.id - b.id
      })
    setWorks(processed)
  }, [])

  const saveWork = async (formData: PersonInfoFormData, isAddMode: boolean, currentItem: Work | null) => {
    try {
      const commonData = {
        name: formData.name,
        description: formData.desc,
        url: formData.url,
        icon_src: formData.icon_src,
        pic_url: formData.pic_url,
        rank: formData.rank || 0
      }

      if (isAddMode) {
        const newItem = { personInfo: { ...commonData, category: 'work' as const } }
        const res = await apiClient({
          url: ENDPOINTS.ADMIN.PERSONINFO,
          method: 'POST',
          data: newItem
        })
        if (res.data.code === API_CODE.SUCCESS) {
          return { success: true, message: '' }
        } else {
          return { success: false, message: res.data.message || '' }
        }
      } else {
        const updatedItem = {
          personInfo: { ...commonData, id: currentItem?.id, category: 'work' as const }
        }
        const res = await apiClient({
          url: ENDPOINTS.ADMIN.PERSONINFO,
          method: 'POST',
          data: updatedItem
        })
        if (res.data.code === API_CODE.SUCCESS) {
          return { success: true, message: '' }
        } else {
          return { success: false, message: res.data.message || '' }
        }
      }
    } catch (error) {
      console.error('保存作品失败:', error)
      return { success: false, message: '保存失败' }
    }
  }

  const deleteWork = async (id: number) => {
    try {
      const res = await apiClient({
        url: `${ENDPOINTS.ADMIN.PERSONINFO}/${id}`,
        method: 'DELETE'
      })

      if (res.data.code === API_CODE.SUCCESS) {
        return { success: true }
      } else {
        return { success: false, message: res.data.message || '' }
      }
    } catch (error) {
      console.error('删除作品失败:', error)
      return { success: false, message: '删除失败' }
    }
  }

  return {
    works,
    setWorks,
    processWorksData,
    saveWork,
    deleteWork
  }
}
