'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { Evaluation, Item, PersonInfoFormData } from '../types'

import { API_CODE } from '@/lib/constants'
export function useEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])

  const processEvaluationsData = useCallback((data: Item[]) => {
    const evaluationsData = data.filter((item: Item) => item.category === 'evaluation')
    const processed = evaluationsData
      .map((item: Item) => ({
        id: item.id,
        name: item.name,
        rank: item.rank || 0
      }))
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank
        }
        return a.id - b.id
      })
    setEvaluations(processed)
  }, [])

  const saveEvaluation = async (formData: PersonInfoFormData, isAddMode: boolean, currentItem: Evaluation | null) => {
    try {
      const commonData = {
        name: formData.name,
        description: '',
        url: '',
        icon_src: '',
        pic_url: '',
        rank: formData.rank || 0
      }

      if (isAddMode) {
        const newItem = { personInfo: { ...commonData, category: 'evaluation' as const } }
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
          personInfo: { ...commonData, id: currentItem?.id, category: 'evaluation' as const }
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
      console.error('保存评价失败:', error)
      return { success: false, message: '保存失败' }
    }
  }

  const deleteEvaluation = async (id: number) => {
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
      console.error('删除评价失败:', error)
      return { success: false, message: '删除失败' }
    }
  }

  return {
    evaluations,
    setEvaluations,
    processEvaluationsData,
    saveEvaluation,
    deleteEvaluation
  }
}
