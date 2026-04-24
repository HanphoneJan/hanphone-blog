'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { Skill, Item, PersonInfoFormData } from '../types'

import { API_CODE } from '@/lib/constants'
export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])

  const processSkillsData = useCallback((data: Item[]) => {
    const skillsData = data.filter((item: Item) => item.category === 'skill')
    const processed = skillsData
      .map((item: Item) => ({
        id: item.id,
        name: item.name,
        url: item.url || '',
        desc: item.description || '',
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
    setSkills(processed)
  }, [])

  const saveSkill = async (formData: PersonInfoFormData, isAddMode: boolean, currentItem: Skill | null) => {
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
        const newItem = { personInfo: { ...commonData, category: 'skill' as const } }
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
          personInfo: { ...commonData, id: currentItem?.id, category: 'skill' as const }
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
      console.error('保存技能失败:', error)
      return { success: false, message: '保存失败' }
    }
  }

  const deleteSkill = async (id: number) => {
    try {
      const res = await apiClient({
        url: `${ENDPOINTS.ADMIN.PERSONINFO}/${id}/delete`,
        method: 'GET'
      })

      if (res.data.code === API_CODE.SUCCESS) {
        return { success: true }
      } else {
        return { success: false, message: res.data.message || '' }
      }
    } catch (error) {
      console.error('删除技能失败:', error)
      return { success: false, message: '删除失败' }
    }
  }

  return {
    skills,
    setSkills,
    processSkillsData,
    saveSkill,
    deleteSkill
  }
}
