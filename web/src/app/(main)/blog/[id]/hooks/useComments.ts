'use client'

import { useState, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'
import type { CommentItem, ParentComment, UserInfo } from '../types'

import { API_CODE } from '@/lib/constants'
interface UseCommentsOptions {
  blogId: number
  userInfo: UserInfo | null
  onShowLogin: () => void
  dispatch: React.Dispatch<any>
  comments: CommentItem[]
}

export function useComments({ blogId, userInfo, onShowLogin, dispatch, comments }: UseCommentsOptions) {
  const [content, setContent] = useState('')

  const findComment = useCallback((commentId: number): CommentItem | null => {
    return comments.find(c => c.id === commentId) || null
  }, [comments])

  const fetchData = useCallback(async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined,
      })
      return await response.json()
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      return { code: 500, data: null }
    }
  }, [])

  const handleSubmitComment = useCallback(async (parentId: number = -1, replyContent?: string) => {
    const commentContent = replyContent || content
    if (!commentContent.trim()) {
      return showAlert(BLOG_DETAIL_LABELS.COMMENT_EMPTY)
    }
    if (commentContent.length > 1000) {
      return showAlert(BLOG_DETAIL_LABELS.COMMENT_MAX_LENGTH)
    }

    try {
      dispatch({ type: 'SET_FORM_LOADING', payload: true })

      if (!userInfo) {
        showAlert(BLOG_DETAIL_LABELS.LOGIN_TO_COMMENT, { type: 'warning', duration: 3000 })
        onShowLogin()
        dispatch({ type: 'SET_FORM_LOADING', payload: false })
        return
      }

      const res = await fetchData(ENDPOINTS.COMMENTS, 'POST', {
        content: commentContent,
        blogId,
        userId: userInfo.id || 1,
        parentId: parentId
      })

      if (res.code !== API_CODE.SUCCESS) {
        showAlert(res.message || BLOG_DETAIL_LABELS.COMMENT_FAIL_RETRY)
      } else {
        let parentCommentInfo: ParentComment | null = null
        if (parentId !== -1) {
          const parentComment = findComment(parentId)
          if (parentComment) {
            parentCommentInfo = {
              id: parentComment.id,
              nickname: parentComment.nickname
            }
          }
        }

        const newComment: CommentItem = {
          id: res.data.id,
          content: commentContent,
          createTime: new Date().toISOString(),
          userId: userInfo.id || 1,
          nickname: userInfo.nickname || '匿名用户',
          avatar: userInfo.avatar || '',
          parentCommentId: parentId === -1 ? null : parentId,
          parentComment: parentCommentInfo
        }

        dispatch({ type: 'ADD_COMMENT', payload: newComment })

        if (!replyContent) {
          setContent('')
        }
        dispatch({ type: 'SET_RP_ACTIVE_ID', payload: -1 })
        showAlert(BLOG_DETAIL_LABELS.COMMENT_SUCCESS)
      }

      dispatch({ type: 'SET_FORM_LOADING', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_FORM_LOADING', payload: false })
      showAlert(BLOG_DETAIL_LABELS.COMMENT_FAIL)
      console.error('提交失败:', error)
    }
  }, [content, blogId, userInfo, onShowLogin, dispatch, findComment, fetchData])

  const handleDeleteComment = useCallback(async (id: number) => {
    try {
      const res = await fetchData(`${ENDPOINTS.COMMENTS}/${id}`, 'DELETE')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(BLOG_DETAIL_LABELS.DELETE_SUCCESS)
        dispatch({ type: 'DELETE_COMMENT', payload: id })
      } else {
        showAlert(res.message || BLOG_DETAIL_LABELS.DELETE_FAIL_RETRY)
      }
    } catch (err) {
      showAlert(BLOG_DETAIL_LABELS.DELETE_FAIL)
      console.error(err)
    }
  }, [dispatch, fetchData])

  const submitReply = useCallback((replyContent: string, commentId: number) => {
    if (!replyContent?.trim()) {
      showAlert(BLOG_DETAIL_LABELS.REPLY_PLACEHOLDER)
      return
    }
    handleSubmitComment(commentId, replyContent)
  }, [handleSubmitComment])

  return {
    content,
    setContent,
    handleSubmitComment,
    handleDeleteComment,
    submitReply
  }
}

export default useComments
