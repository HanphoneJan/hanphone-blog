'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useUser } from '@/contexts/UserContext'

/**
 * 博客主站的聊天「未读数 + 浏览器系统通知」能力。
 *
 * 主站本身没有聊天 UI：悬浮按钮打开的是 `/chat/public` 公共聊天室 iframe。
 * 这里单开一条 socket 连接（与 chat-client 同源同协议），用于：
 * - 统计公共聊天室「自上次打开聊天窗以来」的新消息数 → 悬浮按钮角标；
 * - 收到私信 / 公共新消息时弹浏览器系统通知（Notification API）。
 *
 * 注意：socket 只负责通知/角标，不渲染消息；真正聊天仍在 iframe 内。
 */

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || ''
const CHAT_APP_URL = '/chat/'
const SOCKET_PATH = '/chat-api/socket.io'
const HEARTBEAT_MS = 25_000
const LAST_READ_PUBLIC_KEY = 'chat_public_last_read_id'

/** 公共聊天室消息（socket publicHistory / publicMessageBroadcast，snake_case） */
interface PublicMessageLike {
  id: number
  user_id?: number | null
  nickname?: string
  content?: string
  from_ai?: boolean
}

/** 私信消息（socket message，camelCase） */
interface PrivateMessageLike {
  id: number
  senderId: number
  receiverId: number
  content?: string
  fromAi?: boolean
}

export type NotificationSupport = NotificationPermission | 'unsupported'

interface ChatNotifyContextType {
  /** 公共聊天室未读新消息数（自上次打开悬浮聊天窗以来） */
  publicUnread: number
  /** 浏览器通知权限状态 */
  notificationPermission: NotificationSupport
  /** 主动申请浏览器通知权限（需用户手势，如点击按钮/打开聊天窗） */
  requestNotificationPermission: () => void
  /** 打开/关闭悬浮聊天窗：打开即视为已读，清空公共未读 */
  setPublicChatOpen: (open: boolean) => void
}

const ChatNotifyContext = createContext<ChatNotifyContextType>({
  publicUnread: 0,
  notificationPermission: 'default',
  requestNotificationPermission: () => {},
  setPublicChatOpen: () => {},
})

export const useChatNotify = () => useContext(ChatNotifyContext)

/** 展示一条浏览器系统通知（未授权/不支持时静默跳过） */
function showNotification(title: string, body: string, onClick?: () => void) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag: title })
    n.onclick = () => {
      window.focus()
      n.close()
      onClick?.()
    }
  } catch {
    /* 部分浏览器在后台标签页禁止构造 Notification，忽略 */
  }
}

export const ChatNotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, userInfo } = useUser()
  const [publicUnread, setPublicUnread] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<NotificationSupport>('default')

  // 当前登录身份（事件回调里读取，避免闭包过期）
  const userRef = useRef<{ id: number | null }>({ id: null })
  const tokenRef = useRef<string | null>(null)
  const publicOpenRef = useRef(false)
  const maxPublicIdRef = useRef(0)
  const socketRef = useRef<Socket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    userRef.current = { id: userInfo?.id ?? null }
    tokenRef.current = token
  }, [userInfo, token])

  // 权限初始状态
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
    } else {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      return
    }
    Notification.requestPermission()
      .then(p => setNotificationPermission(p))
      .catch(() => { /* 忽略 */ })
  }, [])

  // 打开聊天窗 = 已读：清空未读并记录已读到的消息 id
  const setPublicChatOpen = useCallback((open: boolean) => {
    publicOpenRef.current = open
    if (!open) return
    setPublicUnread(0)
    if (maxPublicIdRef.current > 0) {
      try {
        localStorage.setItem(LAST_READ_PUBLIC_KEY, String(maxPublicIdRef.current))
      } catch { /* 忽略 */ }
    }
  }, [])

  // socket 连接（挂载一次；token 变化时补认证）
  useEffect(() => {
    const socket = io(SOCKET_URL || undefined, {
      path: SOCKET_PATH,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
    socketRef.current = socket

    const startHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(() => {
        if (socket.connected) socket.emit('heartbeat')
      }, HEARTBEAT_MS)
    }
    const stopHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    socket.on('connect', () => {
      const t = tokenRef.current
      if (t) socket.emit('authenticate', t)
      socket.emit('requestPublicHistory', { limit: 100 })
      startHeartbeat()
    })

    socket.on('disconnect', stopHeartbeat)

    // 公共聊天室历史：首次访问建立基线（不显示历史为未读），此后按已读 id 计算未读
    socket.on('publicHistory', (msgs: PublicMessageLike[]) => {
      const arr = Array.isArray(msgs) ? msgs : []
      if (arr.length === 0) return
      const maxId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0)
      if (maxId > maxPublicIdRef.current) maxPublicIdRef.current = maxId

      // 聊天窗已打开：视为已读，直接落盘最新 id，不计未读
      if (publicOpenRef.current) {
        if (maxId > 0) {
          try { localStorage.setItem(LAST_READ_PUBLIC_KEY, String(maxId)) } catch { /* 忽略 */ }
        }
        setPublicUnread(0)
        return
      }

      let raw: string | null = null
      try { raw = localStorage.getItem(LAST_READ_PUBLIC_KEY) } catch { /* 忽略 */ }
      if (raw === null) {
        // 首次访问：把当前最新消息记为已读，避免把历史消息算成未读
        try { localStorage.setItem(LAST_READ_PUBLIC_KEY, String(maxId)) } catch { /* 忽略 */ }
        setPublicUnread(0)
        return
      }
      const lastRead = Number(raw) || 0
      const myId = userRef.current.id
      const count = arr.filter(m =>
        (Number(m.id) || 0) > lastRead &&
        !(myId != null && Number(m.user_id) === Number(myId))
      ).length
      setPublicUnread(count)
    })

    // 公共聊天室实时新消息：聊天窗未开 → 累计未读 + 浏览器通知
    socket.on('publicMessageBroadcast', (msg: PublicMessageLike) => {
      const mid = Number(msg.id) || 0
      if (mid > maxPublicIdRef.current) maxPublicIdRef.current = mid
      const myId = userRef.current.id
      if (myId != null && Number(msg.user_id) === Number(myId)) return // 自己发的
      if (publicOpenRef.current) return // 聊天窗开着 = 正在看
      setPublicUnread(n => n + 1)
      // 页面在前台时只更新角标，不弹系统通知（避免刷屏）；切到后台才弹
      if (document.visibilityState !== 'visible') {
        showNotification(
          `聊天室 · ${msg.nickname || '匿名'}`,
          msg.content || '',
          () => window.dispatchEvent(new CustomEvent('blog:open-floating-chat'))
        )
      }
    })

    // 私信：非本人、非 AI 自动回复 → 浏览器通知（主站无私信 UI，点通知进聊天站）
    socket.on('message', (msg: PrivateMessageLike) => {
      const myId = userRef.current.id
      if (myId == null) return
      if (Number(msg.senderId) === Number(myId)) return
      if (msg.fromAi) return
      showNotification('收到新私信', msg.content || '', () => {
        window.open(CHAT_APP_URL, '_blank')
      })
    })

    return () => {
      stopHeartbeat()
      socket.off('connect')
      socket.off('disconnect')
      socket.off('publicHistory')
      socket.off('publicMessageBroadcast')
      socket.off('message')
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // token 登录/登出后：连接已建立则补发认证（socket 只在挂载时建一次）
  useEffect(() => {
    const socket = socketRef.current
    if (socket && socket.connected && token) {
      socket.emit('authenticate', token)
    }
  }, [token])

  const value: ChatNotifyContextType = {
    publicUnread,
    notificationPermission,
    requestNotificationPermission,
    setPublicChatOpen,
  }

  return <ChatNotifyContext.Provider value={value}>{children}</ChatNotifyContext.Provider>
}
