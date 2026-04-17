'use client'

import { useCallback, useRef, useReducer, useMemo } from 'react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { essayReducer } from '../utils'
import type { Essay, ApiEssay, UserInfo } from '../types'

const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

export function useEssays(userInfo: UserInfo | null) {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())

  const [state, dispatch] = useReducer(essayReducer, {
    essays: [],
    loading: true,
    commentInputs: {},
    replyInputs: {},
    showReplyBox: {}
  })

  // API调用函数 - 添加缓存机制
  const fetchData = useCallback(async (url: string, method: string = 'GET', data?: unknown) => {
    if (method === 'GET') {
      const cacheKey = `${url}?${JSON.stringify(data)}`
      const cachedData = cacheRef.current.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log('Using cached data for', cacheKey)
        return cachedData.data
      }
    }

    try {
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })

      if (method === 'GET') {
        const cacheKey = `${url}?${JSON.stringify(data)}`
        cacheRef.current.set(cacheKey, { data: response.data, timestamp: Date.now() })
      }

      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      return { code: 500, data: [] }
    }
  }, [])

  // 格式化随笔数据
  const formatEssays = useCallback((apiData: ApiEssay[]): Essay[] => {
    const formattedList = apiData.map((item: ApiEssay) => {
      // 先转换评论数组，再通过 parentCommentId 查找被回复人昵称
      const rawComments = (item.essayComments || []).map(comment => ({
        id: comment.id,
        userId: comment.user.id,
        nickname: comment.user.nickname,
        avatar: comment.user.avatar,
        content: comment.content,
        createTime: comment.createTime || new Date().toISOString(),
        parentCommentId: comment.parentCommentId,
        adminComment: comment.adminComment
      }))

      // 根据 parentCommentId 填充 repliedToNickname
      const comments = rawComments.map(c => ({
        ...c,
        repliedToNickname: c.parentCommentId
          ? rawComments.find(rc => rc.id === c.parentCommentId)?.nickname ?? null
          : null
      }))

      return {
        id: item.id,
        userId: item.user.id,
        nickname: item.user.nickname,
        avatar: item.user.avatar,
        title: item.title,
        content: item.content,
        createTime: item.createTime,
        likeCount: item.likes || 0,
        isLiked: item.liked || false,
        comments,
        commentCount: (item.essayComments || []).length,
        fileList: item.essayFileUrls?.length
          ? {
              Images: item.essayFileUrls.filter(f => f.urlType === 'IMAGE').map(f => f.url),
              Videos: item.essayFileUrls.filter(f => f.urlType === 'VIDEO').map(f => f.url),
              Texts: item.essayFileUrls.filter(f => f.urlType === 'TEXT').map(f => f.url)
            }
          : { Images: [], Videos: [], Texts: [] },
        recommend: item.recommend || false
      }
    })

    return formattedList.sort((a, b) => {
      if (a.recommend && !b.recommend) return -1
      if (!a.recommend && b.recommend) return 1
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    })
  }, [])

  return {
    state,
    dispatch,
    fetchData,
    formatEssays
  }
}
