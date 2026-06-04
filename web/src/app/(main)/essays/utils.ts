'use client'

import { EssayState, EssayAction, FileType, Comment } from './types'

// Essay Reducer
export const essayReducer = (state: EssayState, action: EssayAction): EssayState => {
  switch (action.type) {
    case 'SET_ESSAYS':
      return { ...state, essays: action.payload }
    case 'ADD_ESSAYS':
      return { ...state, essays: [...state.essays, ...action.payload] }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'UPDATE_LIKE':
      return {
        ...state,
        essays: state.essays.map(essay =>
          essay.id === action.payload.essayId
            ? { ...essay, isLiked: action.payload.isLiked, likeCount: action.payload.likeCount }
            : essay
        )
      }
    case 'ADD_COMMENT':
      return {
        ...state,
        essays: state.essays.map(essay =>
          essay.id === action.payload.essayId
            ? {
                ...essay,
                comments: [...essay.comments, action.payload.comment],
                commentCount: essay.commentCount + 1
              }
            : essay
        )
      }
    case 'DELETE_COMMENT':
      return {
        ...state,
        essays: state.essays.map(essay => {
          if (essay.id === action.payload.essayId) {
            const updatedComments = essay.comments.filter(
              comment => comment.id !== action.payload.commentId
            )
            return { ...essay, comments: updatedComments, commentCount: updatedComments.length }
          }
          return essay
        })
      }
    case 'SET_COMMENT_INPUT':
      return {
        ...state,
        commentInputs: { ...state.commentInputs, [action.payload.essayId]: action.payload.value }
      }
    case 'SET_REPLY_INPUT':
      return {
        ...state,
        replyInputs: { ...state.replyInputs, [action.payload.commentId]: action.payload.value }
      }
    case 'TOGGLE_REPLY_BOX':
      return {
        ...state,
        showReplyBox: {
          ...Object.keys(state.showReplyBox).reduce(
            (acc, key) => {
              const numKey = parseInt(key)
              if (numKey !== action.payload.commentId) {
                acc[numKey] = false
              }
              return acc
            },
            {} as Record<number, boolean>
          ),
          [action.payload.commentId]: action.payload.value
        }
      }
    default:
      return state
  }
}

// 判断文件类型
export const getFileType = (url: string): FileType => {
  const lowerUrl = url.toLowerCase()
  if (
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.endsWith('.webp')
  ) {
    return 'image'
  }
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.avi')
  ) {
    return 'video'
  }
  return 'text'
}

// 获取文件名
export const getFileName = (url: string): string => {
  const fileName = url.split('/').pop() || '文件'
  try {
    return decodeURIComponent(fileName)
  } catch (e) {
    console.log('文件名解码错误' + e)
    return fileName
  }
}

// 日期格式化
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}小时前`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}天前`
  }

  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
}

// 获取被回复的用户昵称
export const getRepliedUserNickname = (
  comments: Comment[],
  parentId: number | null | undefined
): string | null => {
  if (!parentId) return null
  const parentComment = comments.find(comment => comment.id === parentId)
  return parentComment?.nickname || null
}
