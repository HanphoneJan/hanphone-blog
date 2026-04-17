'use client'

import { useReducer, useEffect, useCallback, useMemo, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { ENDPOINTS } from '@/lib/api'
import { STORAGE_KEYS, ASSETS } from '@/lib/constants'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'
import type { Blog, CommentItem, RelatedBlog, UserInfo, BlogState, BlogAction } from '../types'

// 初始状态
const initialState: BlogState = {
  blog: {
    id: 0,
    title: '',
    content: '',
    firstPicture: '',
    createTime: '',
    views: 0,
    flag: '',
    likes: 0,
    isLiked: false,
    published: false,
    user: { id: 0, nickname: '', avatar: '' },
    tags: [],
    comments: []
  },
  rpActiveId: -1,
  comments: [],
  formLoading: false,
  loading: false,
  likeLoading: false,
  headings: [],
  activeHeading: '',
  isMobile: false,
  sidebarOpen: false,
  headerHeight: 0,
  commentsLoaded: false,
  readingProgress: 0
}

// Reducer函数
const blogReducer = (state: BlogState, action: BlogAction): BlogState => {
  switch (action.type) {
    case 'SET_BLOG':
      return { ...state, blog: action.payload }
    case 'SET_RP_ACTIVE_ID':
      return { ...state, rpActiveId: action.payload }
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload }
    case 'SET_FORM_LOADING':
      return { ...state, formLoading: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_LIKE_LOADING':
      return { ...state, likeLoading: action.payload }
    case 'SET_HEADINGS':
      return { ...state, headings: action.payload }
    case 'SET_ACTIVE_HEADING':
      return { ...state, activeHeading: action.payload }
    case 'SET_IS_MOBILE':
      return { ...state, isMobile: action.payload }
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload }
    case 'SET_HEADER_HEIGHT':
      return { ...state, headerHeight: action.payload }
    case 'TOGGLE_LIKE':
      return {
        ...state,
        blog: {
          ...state.blog,
          isLiked: !state.blog.isLiked,
          likes: state.blog.isLiked ? state.blog.likes - 1 : state.blog.likes + 1
        }
      }
    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload].sort(
          (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
        )
      }
    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter(c => c.id !== action.payload)
      }
    case 'SET_COMMENTS_LOADED':
      return { ...state, commentsLoaded: action.payload }
    case 'SET_READING_PROGRESS':
      return { ...state, readingProgress: action.payload }
    default:
      return state
  }
}

export function useBlogDetail(blogId: string, initialBlog?: Blog, initialRelatedBlogs?: RelatedBlog[]) {
  const [state, dispatch] = useReducer(blogReducer, initialBlog ? { ...initialState, blog: initialBlog } : initialState)
  const [relatedBlogs, setRelatedBlogs] = useState<RelatedBlog[]>(initialRelatedBlogs || [])
  const { userInfo: contextUserInfo, administrator, onShowLogin } = useUser()

  // 本地用户信息
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    if (contextUserInfo) {
      return contextUserInfo
    }
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER_INFO)
      if (storedUser) {
        try {
          return JSON.parse(storedUser)
        } catch (e) {
          console.error('Failed to parse user info from localStorage', e)
          return null
        }
      }
    }
    return null
  })

  // 同步用户信息
  useEffect(() => {
    if (contextUserInfo) {
      setUserInfo(contextUserInfo)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(contextUserInfo))
      }
    }
  }, [contextUserInfo])

  // 检测移动端
  useEffect(() => {
    const checkIsMobile = () => {
      dispatch({ type: 'SET_IS_MOBILE', payload: window.innerWidth < 768 })
    }
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // 获取头部高度
  useEffect(() => {
    const headerElement = document.querySelector('header')
    if (headerElement) {
      dispatch({ type: 'SET_HEADER_HEIGHT', payload: headerElement.offsetHeight })
    }
    const handleResize = () => {
      const header = document.querySelector('header')
      if (header) {
        dispatch({ type: 'SET_HEADER_HEIGHT', payload: header.offsetHeight })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 计算阅读统计
  const { wordCount, readingTimeMinutes } = useMemo(() => {
    const content = state.blog.content
    const wordCount = content.length
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 800))
    return { wordCount, readingTimeMinutes }
  }, [state.blog.content])

  // API请求封装
  const fetchData = useCallback(async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })
      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      return { code: 500, data: null }
    }
  }, [])

  // 获取博客详情
  const fetchBlogInfo = useCallback(async () => {
    // 如果有初始数据，不需要重新获取
    if (initialBlog && state.blog.id === initialBlog.id) {
      return
    }
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const queryParams = userInfo?.id ? { userId: userInfo.id } : {}
      const res = await fetchData(`${ENDPOINTS.BLOG}/${blogId}`, 'GET', queryParams)

      if (res.code === 200) {
        const blogData = {
          ...res.data,
          likes: res.data.likes ?? 0,
          isLiked: res.data.liked !== undefined ? res.data.liked : false
        }
        dispatch({ type: 'SET_BLOG', payload: blogData })

        if (!state.commentsLoaded) {
          const { comments } = blogData
          const sortedComments = comments.sort(
            (a: CommentItem, b: CommentItem) =>
              new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
          )
          dispatch({ type: 'SET_COMMENTS', payload: sortedComments })
        }
      } else {
        showAlert(BLOG_DETAIL_LABELS.FETCH_BLOG_FAIL)
      }
    } catch (err) {
      showAlert(BLOG_DETAIL_LABELS.FETCH_BLOG_FAIL)
      console.error(err)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [blogId, userInfo?.id, state.commentsLoaded, fetchData])

  // 获取相关博客
  const fetchRelatedBlogs = useCallback(async () => {
    // 如果已有初始相关博客，不需要重新获取
    if (initialRelatedBlogs && initialRelatedBlogs.length > 0) {
      return
    }

    const typeId = state.blog.type?.id
    if (!typeId || !state.blog.id) return

    try {
      const res = await apiClient.get(ENDPOINTS.TYPE_BLOGS(typeId))
      const content = res.data?.data?.content ?? res.data?.content ?? []
      const list = (Array.isArray(content) ? content : [])
        .filter((b: Blog) => b.id !== state.blog.id)
        .slice(0, 6)
        .map((b: Blog) => ({ id: b.id, title: b.title }))
      setRelatedBlogs(list)
    } catch {
      setRelatedBlogs([])
    }
  }, [state.blog.id, state.blog.type?.id, initialRelatedBlogs])

  // 点赞
  const handleLike = useCallback(async () => {
    if (!userInfo) {
      showAlert(BLOG_DETAIL_LABELS.LOGIN_TO_LIKE, { type: 'warning', duration: 3000 })
      onShowLogin()
      return
    }
    try {
      dispatch({ type: 'SET_LIKE_LOADING', payload: true })
      dispatch({ type: 'TOGGLE_LIKE' })
      const res = await fetchData(`${ENDPOINTS.BLOG}/${state.blog.id}/like`, 'POST', {
        userId: userInfo.id,
        blogId: state.blog.id,
        isLike: !state.blog.isLiked
      })
      if (res.code !== 200) {
        dispatch({ type: 'TOGGLE_LIKE' })
        showAlert(res.message || BLOG_DETAIL_LABELS.OPERATION_FAIL_RETRY)
      }
    } catch (error) {
      dispatch({ type: 'TOGGLE_LIKE' })
      showAlert(BLOG_DETAIL_LABELS.OPERATION_FAIL)
      console.error('点赞失败:', error)
    } finally {
      dispatch({ type: 'SET_LIKE_LOADING', payload: false })
    }
  }, [userInfo, onShowLogin, state.blog.id, state.blog.isLiked, fetchData])

  return {
    state,
    dispatch,
    userInfo,
    administrator,
    relatedBlogs,
    wordCount,
    readingTimeMinutes,
    fetchBlogInfo,
    fetchRelatedBlogs,
    handleLike,
    onShowLogin
  }
}

export default useBlogDetail
