import { useState, useEffect, useReducer, useCallback } from 'react'
import { ENDPOINTS } from '@/lib/api'
import { ASSETS } from '@/lib/constants'
import { MESSAGE_LABELS } from '@/lib/labels'
import { showAlert } from '@/lib/Alert'

export interface Message {
  id: number
  nickname: string
  avatar: string
  content: string
  createTime: string
  parentMessage: Message | null
  adminMessage: boolean
  children?: Message[]
}

type MessageAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_REPLY'; payload: { parentId: number; reply: Message } }
  | { type: 'DELETE_MESSAGE'; payload: number }
  | { type: 'DELETE_REPLY'; payload: { parentId: number; replyId: number } }

const messageReducer = (state: Message[], action: MessageAction): Message[] => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return action.payload
    case 'ADD_MESSAGE':
      return [action.payload, ...state]
    case 'ADD_REPLY': {
      const { parentId, reply } = action.payload
      return state.map(msg => {
        if (msg.id === parentId) {
          return { ...msg, children: [...(msg.children || []), reply] }
        }
        if (msg.children) {
          const updated = msg.children.map(child => {
            if (child.id === parentId) {
              return { ...child, children: [...(child.children || []), reply] }
            }
            return child
          })
          if (JSON.stringify(updated) !== JSON.stringify(msg.children)) {
            return { ...msg, children: updated }
          }
        }
        return msg
      })
    }
    case 'DELETE_MESSAGE':
      return state.filter(msg => msg.id !== action.payload)
    case 'DELETE_REPLY': {
      const { parentId: pId, replyId } = action.payload
      return state.map(msg => {
        if (msg.id === pId) {
          return { ...msg, children: msg.children?.filter(c => c.id !== replyId) || [] }
        }
        if (msg.children) {
          const updated = msg.children.map(child => {
            if (child.id === pId) {
              return { ...child, children: child.children?.filter(sc => sc.id !== replyId) || [] }
            }
            return child
          })
          if (JSON.stringify(updated) !== JSON.stringify(msg.children)) {
            return { ...msg, children: updated }
          }
        }
        return msg
      })
    }
    default:
      return state
  }
}

const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }
    const res = await fetch(url, options)
    return await res.json()
  } catch (error) {
    console.log(`Error fetching ${url}:`, error)
    return { code: 500, data: [] }
  }
}

const buildMessageTree = (messages: Message[]): Message[] => {
  const map = new Map<number, Message>()
  messages.forEach(msg => map.set(msg.id, { ...msg, children: [] }))

  const findRoot = (parentId: number): Message | undefined => {
    const parent = map.get(parentId)
    if (!parent) return undefined
    if (!parent.parentMessage) return parent
    return findRoot(parent.parentMessage.id)
  }

  const roots: Message[] = []
  messages.forEach(msg => {
    const current = map.get(msg.id)!
    if (!msg.parentMessage) {
      roots.push(current)
    } else {
      const root = findRoot(msg.parentMessage.id)
      root ? root.children?.push(current) : roots.push(current)
    }
  })

  roots.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
  roots.forEach(msg => {
    msg.children?.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime())
  })
  return roots
}

export function useMessages(userInfo: { nickname?: string; avatar?: string } | null, administrator: boolean) {
  const [loading, setLoading] = useState(true)
  const [messages, dispatch] = useReducer(messageReducer, [])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    const res = await fetchData(ENDPOINTS.MESSAGES)
    if (res.code === 200 && res.flag) {
      dispatch({ type: 'SET_MESSAGES', payload: buildMessageTree(res.data) })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const publish = useCallback(async (content: string) => {
    if (!content.trim() || content.length > 500) return false
    try {
      const message = {
        content,
        nickname: userInfo?.nickname || '匿名用户',
        avatar: userInfo?.avatar || ASSETS.DEFAULT_AVATAR,
        parentMessage: null
      }
      const res = await fetchData(ENDPOINTS.MESSAGES, 'POST', { message })
      if (res.code === 200) {
        const newMsg: Message = {
          ...message,
          id: res.data.id,
          createTime: new Date().toISOString(),
          parentMessage: null,
          adminMessage: administrator,
          children: []
        }
        dispatch({ type: 'ADD_MESSAGE', payload: newMsg })
        showAlert(MESSAGE_LABELS.SEND_SUCCESS)
        return true
      }
      showAlert(MESSAGE_LABELS.SEND_FAIL)
      return false
    } catch {
      showAlert(MESSAGE_LABELS.SEND_FAIL)
      return false
    }
  }, [userInfo, administrator])

  const reply = useCallback(async (messageId: number, content: string) => {
    if (!content.trim() || content.length > 500) return false
    try {
      // 在 tree 中找到目标消息
      const findMsg = (list: Message[]): Message | undefined => {
        for (const m of list) {
          if (m.id === messageId) return m
          if (m.children) {
            const found = findMsg(m.children)
            if (found) return found
          }
        }
        return undefined
      }
      const target = findMsg(messages)
      if (!target) {
        showAlert(MESSAGE_LABELS.REPLY_NOT_FOUND)
        return false
      }

      const message = {
        content,
        nickname: userInfo?.nickname || '匿名用户',
        avatar: userInfo?.avatar || ASSETS.DEFAULT_AVATAR,
        parentId: target.id
      }
      const res = await fetchData(ENDPOINTS.MESSAGES, 'POST', { message })
      if (res.code === 200) {
        const newReply: Message = {
          ...message,
          id: res.data.id,
          createTime: new Date().toISOString(),
          parentMessage: target,
          adminMessage: administrator,
          children: []
        }
        // 找到顶级父消息
        const findRootId = (list: Message[]): number | null => {
          for (const m of list) {
            if (m.id === messageId) return m.id
            if (m.children) {
              const found = findMsg(m.children)
              if (found) return m.id
            }
          }
          return null
        }
        const parentId = target.parentMessage ? findRootId(messages) || messageId : messageId
        dispatch({ type: 'ADD_REPLY', payload: { parentId, reply: newReply } })
        showAlert(MESSAGE_LABELS.REPLY_SUCCESS)
        return true
      }
      showAlert(MESSAGE_LABELS.REPLY_FAIL)
      return false
    } catch {
      showAlert(MESSAGE_LABELS.REPLY_FAIL)
      return false
    }
  }, [userInfo, administrator, messages])

  const remove = useCallback(async (id: number) => {
    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.MESSAGES}/${id}`, 'DELETE')
      if (res.code === 200) {
        const isTop = messages.some(m => m.id === id)
        if (isTop) {
          dispatch({ type: 'DELETE_MESSAGE', payload: id })
        } else {
          for (const msg of messages) {
            if (msg.children?.some(c => c.id === id)) {
              dispatch({ type: 'DELETE_REPLY', payload: { parentId: msg.id, replyId: id } })
              break
            }
            if (msg.children) {
              for (const child of msg.children) {
                if (child.children?.some(sc => sc.id === id)) {
                  dispatch({ type: 'DELETE_REPLY', payload: { parentId: child.id, replyId: id } })
                  break
                }
              }
            }
          }
        }
        showAlert(MESSAGE_LABELS.DELETE_SUCCESS)
      } else {
        showAlert(res.message || MESSAGE_LABELS.DELETE_FAIL_RETRY)
      }
    } catch (err) {
      showAlert(MESSAGE_LABELS.DELETE_FAIL)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [messages])

  return { messages, loading, publish, reply, remove, refetch: fetchMessages }
}
