'use client'

import { useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import { showAlert } from '@/lib/Alert'
import { ESSAY_LABELS } from '@/lib/labels'
import type { Essay, UserInfo, Comment } from '../types'

import { API_CODE } from '@/lib/constants'
interface UseEssayActionsOptions {
  userInfo: UserInfo | null
  essays: Essay[]
  administrator: boolean
  onShowLogin: () => void
  dispatch: React.Dispatch<any>
  fetchData: (url: string, method?: string, data?: unknown) => Promise<any>
}

export function useEssayActions({
  userInfo,
  essays,
  administrator,
  onShowLogin,
  dispatch,
  fetchData
}: UseEssayActionsOptions) {
  // 点赞/取消点赞
  const toggleLike = useCallback(async (essayId: number) => {
    if (!userInfo) {
      showAlert(ESSAY_LABELS.LOGIN_TO_LIKE)
      onShowLogin()
      return
    }

    const currentEssay = essays.find(essay => essay.id === essayId)
    if (!currentEssay) return

    const currentIsLiked = currentEssay.isLiked
    const newIsLiked = !currentIsLiked
    const newLikeCount = currentIsLiked ? currentEssay.likeCount - 1 : currentEssay.likeCount + 1

    // 立即更新UI
    dispatch({
      type: 'UPDATE_LIKE',
      payload: { essayId, isLiked: newIsLiked, likeCount: newLikeCount }
    })

    try {
      const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/like`, 'POST', {
        userId: userInfo.id,
        essayId: essayId,
        isLike: newIsLiked
      })

      if (res.code !== API_CODE.SUCCESS) {
        // 回滚状态
        dispatch({
          type: 'UPDATE_LIKE',
          payload: { essayId, isLiked: currentIsLiked, likeCount: currentEssay.likeCount }
        })
        showAlert(ESSAY_LABELS.OPERATION_FAIL)
      }
    } catch (error) {
      console.log('点赞操作失败:', error)
      dispatch({
        type: 'UPDATE_LIKE',
        payload: { essayId, isLiked: currentIsLiked, likeCount: currentEssay.likeCount }
      })
      showAlert(ESSAY_LABELS.OPERATION_FAIL)
    }
  }, [userInfo, essays, onShowLogin, dispatch, fetchData])

  // 提交评论
  const submitComment = useCallback(async (essayId: number, content: string) => {
    if (!userInfo) {
      showAlert(ESSAY_LABELS.LOGIN_TO_COMMENT)
      onShowLogin()
      return
    }

    const trimmedContent = content?.trim()
    if (!trimmedContent) {
      showAlert(ESSAY_LABELS.COMMENT_EMPTY)
      return
    }

    try {
      const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/comments`, 'POST', {
        userId: userInfo.id,
        content: trimmedContent,
        parentCommentId: -1
      })

      if (res.code === API_CODE.SUCCESS) {
        const newComment: Comment = {
          id: res.data.id,
          userId: userInfo.id,
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || '',
          content: trimmedContent,
          createTime: new Date().toISOString(),
          parentCommentId: null,
          adminComment: administrator || false
        }

        dispatch({ type: 'ADD_COMMENT', payload: { essayId, comment: newComment } })
        dispatch({ type: 'SET_COMMENT_INPUT', payload: { essayId, value: '' } })
        showAlert(ESSAY_LABELS.COMMENT_SUCCESS)
      } else {
        showAlert(ESSAY_LABELS.COMMENT_FAIL)
      }
    } catch (error) {
      console.log('评论操作失败:', error)
      showAlert(ESSAY_LABELS.COMMENT_FAIL)
    }
  }, [userInfo, administrator, onShowLogin, dispatch, fetchData, essays])

  // 提交回复
  const submitReply = useCallback(async (essayId: number, commentId: number, content: string) => {
    if (!userInfo) {
      showAlert(ESSAY_LABELS.LOGIN_TO_REPLY)
      onShowLogin()
      return
    }

    const trimmedContent = content?.trim()
    if (!trimmedContent) {
      showAlert(ESSAY_LABELS.REPLY_EMPTY)
      return
    }

    try {
      const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/comments`, 'POST', {
        userId: userInfo.id,
        content: trimmedContent,
        parentCommentId: commentId || -1
      })

      if (res.code === API_CODE.SUCCESS) {
        const newReply: Comment = {
          id: res.data.id,
          userId: userInfo.id,
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || '',
          content: trimmedContent,
          createTime: new Date().toISOString(),
          parentCommentId: commentId,
          repliedToNickname: essays.find(e => e.id === essayId)?.comments.find(c => c.id === commentId)?.nickname ?? null,
          adminComment: administrator || false
        }

        dispatch({ type: 'ADD_COMMENT', payload: { essayId, comment: newReply } })
        dispatch({ type: 'SET_REPLY_INPUT', payload: { commentId, value: '' } })
        dispatch({ type: 'TOGGLE_REPLY_BOX', payload: { commentId, value: false } })
        showAlert(ESSAY_LABELS.REPLY_SUCCESS)
      } else {
        showAlert(ESSAY_LABELS.REPLY_FAIL)
      }
    } catch (error) {
      console.log('回复操作失败:', error)
      showAlert(ESSAY_LABELS.REPLY_FAIL)
    }
  }, [userInfo, administrator, onShowLogin, dispatch, fetchData, essays])

  // 删除评论（仅管理员）
  const deleteComment = useCallback(async (essayId: number, commentId: number) => {
    if (!administrator) {
      showAlert(ESSAY_LABELS.NO_DELETE_PERMISSION)
      return
    }

    try {
      const res = await fetchData(`${ENDPOINTS.ESSAYS}/comments/${commentId}`, 'DELETE')

      if (res.code === API_CODE.SUCCESS) {
        dispatch({ type: 'DELETE_COMMENT', payload: { essayId, commentId } })
        showAlert(ESSAY_LABELS.DELETE_SUCCESS)
      } else {
        showAlert(ESSAY_LABELS.DELETE_FAIL)
      }
    } catch (error) {
      console.log('删除评论操作失败:', error)
      showAlert(ESSAY_LABELS.DELETE_FAIL)
    }
  }, [administrator, dispatch, fetchData])

  // 切换回复框
  const toggleReplyBox = useCallback((commentId: number, currentValue: boolean) => {
    if (!userInfo) {
      showAlert(ESSAY_LABELS.LOGIN_TO_REPLY)
      onShowLogin()
      return
    }

    dispatch({ type: 'TOGGLE_REPLY_BOX', payload: { commentId, value: !currentValue } })
  }, [userInfo, onShowLogin, dispatch])

  return {
    toggleLike,
    submitComment,
    submitReply,
    deleteComment,
    toggleReplyBox
  }
}
