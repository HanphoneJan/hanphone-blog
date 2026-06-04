'use client'

import { useState, useCallback, useRef } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_BLOG_LABELS } from '@/lib/labels'
import type { Blog, Tag } from '../types'

import {  API_CODE , TIME } from '@/lib/constants'
interface UseTagsProps {
  tagList: Tag[]
  setTagList: React.Dispatch<React.SetStateAction<Tag[]>>
  setBlogList: React.Dispatch<React.SetStateAction<Blog[]>>
  fetchData: (url: string, method?: string, data?: unknown) => Promise<{ code: number; data: unknown }>
}

export function useTags({ tagList, setTagList, setBlogList, fetchData }: UseTagsProps) {
  const editInputRef = useRef<HTMLInputElement>(null)

  const showInput = useCallback((row: Blog) => {
    setBlogList(prev =>
      prev.map(item => (item.id === row.id ? { ...item, inputVisible: true } : item))
    )

    setTimeout(() => {
      editInputRef.current?.focus()
    }, TIME.ALERT_INIT_DELAY)
  }, [setBlogList])

  const handleInputConfirm = useCallback(async (row: Blog) => {
    const tagName = row.inputValue?.trim()
    if (!tagName) {
      setBlogList(prev =>
        prev.map(item =>
          item.id === row.id ? { ...item, inputVisible: false, inputValue: '' } : item
        )
      )
      return
    }

    try {
      let newTag: Tag | undefined
      const existingTag = tagList.find(item => item.name === tagName)

      if (existingTag) {
        newTag = existingTag
      } else {
        const res = await fetchData(ENDPOINTS.ADMIN.TAGS, 'POST', { tag: { name: tagName } })
        if (res.code === API_CODE.SUCCESS) {
          newTag = res.data as Tag
          setTagList(prev => [...prev, newTag as Tag])
        } else {
          throw new Error()
        }
      }

      if (!newTag) throw new Error('Tag not created')

      const updatedBlog = {
        ...row,
        tags: [...row.tags, newTag],
        inputVisible: false,
        inputValue: ''
      }

      const res = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', { blog: updatedBlog })
      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_BLOG_LABELS.TAG_ADD_SUCCESS)
        setBlogList(prev => prev.map(item => (item.id === row.id ? updatedBlog : item)))
      } else {
        throw new Error()
      }
    } catch (error) {
      console.log('添加标签错误' + error)
      showAlert(ADMIN_BLOG_LABELS.TAG_ADD_FAIL)
    }
  }, [tagList, setTagList, setBlogList, fetchData])

  const handleTagClose = useCallback(async (i: number, row: Blog) => {
    try {
      const updatedTags = [...row.tags]
      updatedTags.splice(i, 1)
      const validTags = updatedTags.filter(Boolean) as Tag[]

      const updatedBlog = { ...row, tags: validTags }

      const res1 = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', { blog: updatedBlog })
      if (res1.code !== API_CODE.SUCCESS) throw new Error()

      const deletedTag = row.tags[i]
      await apiClient({
        url: `${ENDPOINTS.ADMIN.DEAL_DELETED_TAG}/${deletedTag.id}`,
        method: 'GET'
      })

      showAlert(ADMIN_BLOG_LABELS.TAG_DELETE_SUCCESS)
      setBlogList(prev => prev.map(item => (item.id === row.id ? updatedBlog : item)))
    } catch (error) {
      console.log('删除标签错误' + error)
      showAlert(ADMIN_BLOG_LABELS.TAG_DELETE_FAIL)
    }
  }, [setBlogList, fetchData])

  const handleEnterKeyPress = useCallback((e: React.KeyboardEvent, row: Blog) => {
    if (e.key === 'Enter') {
      handleInputConfirm(row)
    }
  }, [handleInputConfirm])

  return {
    editInputRef,
    showInput,
    handleInputConfirm,
    handleTagClose,
    handleEnterKeyPress
  }
}
