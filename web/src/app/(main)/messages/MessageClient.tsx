'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useUser } from '@/contexts/UserContext'
import { ASSETS } from '@/lib/constants'
import { Send, Delete, Sparkles } from 'lucide-react'
import { useMessages, type Message } from './hooks/useMessages'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import './message.css'

// ============================================
// 右侧滚动导航条组件
// ============================================
interface ScrollNavBarProps {
  messages: Message[]
  activeId: number | null
  onNavigate: (id: number) => void
  isVisible: boolean
}

const ScrollNavBar = ({ messages, activeId, onNavigate, isVisible }: ScrollNavBarProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  if (!isVisible || messages.length === 0) return null

  const handleClick = (messageId: number, index: number) => {
    onNavigate(messageId)
    const element = document.getElementById(messageId.toString())
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center">
      {/* 细长的轨道 */}
      <div className="relative flex flex-col items-center py-2">
        {/* 背景线 */}
        <div 
          className="absolute w-px bg-[rgb(var(--msg-border))] rounded-full"
          style={{ 
            top: '12px', 
            bottom: '12px',
            opacity: 0.5 
          }} 
        />
        
        {/* 指示点 */}
        <div className="relative flex flex-col gap-1.5">
          {messages.map((message, index) => {
            const isActive = activeId === message.id
            const isHovered = hoveredIndex === index
            
            return (
              <button
                key={message.id}
                onClick={() => handleClick(message.id, index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative w-6 h-5 flex items-center justify-center group"
                title={`${message.nickname} 的留言`}
              >
                {/* 点 */}
                <span 
                  className={`
                    block rounded-full transition-all duration-200
                    ${isActive 
                      ? 'w-2 h-2 bg-[rgb(var(--msg-accent))]' 
                      : isHovered
                        ? 'w-1.5 h-1.5 bg-[rgb(var(--msg-text))]'
                        : 'w-1 h-1 bg-[rgb(var(--msg-muted))]'
                    }
                  `}
                  style={{
                    opacity: isActive ? 1 : isHovered ? 0.8 : 0.5
                  }}
                />
                
                {/* 悬停提示 */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="absolute right-7 top-1/2 -translate-y-1/2 whitespace-nowrap"
                    >
                      <div className="bg-[rgb(var(--msg-surface))] border border-[rgb(var(--msg-border))] rounded px-2 py-1 text-xs text-[rgb(var(--msg-text))] shadow-lg">
                        {message.nickname}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 留言项入场动画
const messageItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// 列表容器交错动画
const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04
    }
  }
}

// ============================================
// 子组件
// ============================================

/** 头像组件 */
const MsgAvatar = ({ 
  src, 
  alt,
  size = 'md'
}: { 
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11'
  }

  return (
    <div className={`msg-avatar ${sizeClasses[size]} shrink-0`}>
      <Image
        src={src || ASSETS.DEFAULT_AVATAR}
        alt={alt}
        fill
        loading="eager"
        className="object-cover"
      />
    </div>
  )
}

/** 按钮组件 */
interface MsgButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  icon?: React.ReactNode
  type?: 'button' | 'submit'
}

const MsgButton = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary',
  icon,
  type = 'button'
}: MsgButtonProps) => {
  const baseClasses = variant === 'primary' ? 'msg-btn' : 'msg-btn msg-btn-secondary'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

/** 文本域组件 */
interface MsgTextareaProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  maxLength?: number
}

const MsgTextarea = ({ 
  value, 
  onChange, 
  placeholder = '',
  rows = 2,
  maxLength = 500
}: MsgTextareaProps) => (
  <div className="relative">
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      maxLength={maxLength}
      className="msg-textarea py-2 px-1"
    />
    <div className="absolute bottom-1 right-1 text-xs msg-meta opacity-60">
      {value.length}/{maxLength}
    </div>
  </div>
)

/** 骨架屏组件 */
const MessageSkeleton = () => (
  <div className="flex gap-3 py-3">
    <div className="msg-skeleton w-10 h-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2 pt-1">
      <div className="msg-skeleton h-3.5 w-20" />
      <div className="msg-skeleton h-3 w-full" />
      <div className="msg-skeleton h-3 w-16" />
    </div>
  </div>
)

/** 空状态组件 */
const EmptyState = () => (
  <div className="msg-empty">
    <div className="msg-empty-icon">📝</div>
    <p className="msg-empty-text">还没有留言，快来抢沙发吧～</p>
  </div>
)

/** 黑板角落装饰 */
const MsgCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const positionClasses = {
    tl: 'top-4 left-4',
    tr: 'top-4 right-4',
    bl: 'bottom-4 left-4',
    br: 'bottom-4 right-4'
  }

  return (
    <div className={`msg-corner ${positionClasses[position]}`}>
      <svg viewBox="0 0 40 40">
        {position === 'tl' && (
          <path d="M5 20 Q 10 5, 20 5 M5 35 Q 15 25, 20 15" />
        )}
        {position === 'tr' && (
          <path d="M35 20 Q 30 5, 20 5 M35 35 Q 25 25, 20 15" />
        )}
        {position === 'bl' && (
          <path d="M5 20 Q 10 35, 20 35 M5 5 Q 15 15, 20 25" />
        )}
        {position === 'br' && (
          <path d="M35 20 Q 30 35, 20 35 M35 5 Q 25 15, 20 25" />
        )}
      </svg>
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export default function MessageClient() {
  const { userInfo, administrator } = useUser()
  const { messages, loading, publish, reply, remove } = useMessages(userInfo, administrator)

  // 表单状态
  const [messageForm, setMessageForm] = useState({ content: '' })
  const [replyForm, setReplyForm] = useState<Record<number, string>>({})
  const [replyingMessageId, setReplyingMessageId] = useState<number | null>(null)
  
  // UI 状态
  const [screenWidth, setScreenWidth] = useState(1200)
  const [collapsedReplies, setCollapsedReplies] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; messageId: number | null }>({
    isOpen: false,
    messageId: null,
  })

  // 哈希路由状态
  const [visibleMessageId, setVisibleMessageId] = useState<number | null>(null)
  const hasScrolledToHash = useRef(false)
  const visibleObserverRef = useRef<IntersectionObserver | null>(null)

  // 响应式检测
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = useMemo(() => screenWidth < 768, [screenWidth])

  // 处理哈希跳转 - 只在初始加载时执行一次
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0 && !hasScrolledToHash.current) {
      const hash = window.location.hash
      if (hash) {
        const messageId = parseInt(hash.slice(1))
        if (!isNaN(messageId)) {
          const element = document.getElementById(messageId.toString())
          if (element) {
            hasScrolledToHash.current = true
            setTimeout(() => {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }
        }
      }
    }
  }, [messages])

  // 可见性观察器 - 选择最靠近视口顶部的可见留言
  useEffect(() => {
    if (visibleObserverRef.current) {
      visibleObserverRef.current.disconnect()
    }

    visibleObserverRef.current = new IntersectionObserver(
      entries => {
        // 找到所有可见的元素，选择最靠近视口顶部的
        const visibleEntries = entries.filter(entry => entry.isIntersecting)
        
        if (visibleEntries.length > 0) {
          // 按距离视口顶部的距离排序，选择最靠近顶部的
          const topMostEntry = visibleEntries.reduce((top, current) => {
            return current.boundingClientRect.top < top.boundingClientRect.top ? current : top
          })
          const messageId = parseInt(topMostEntry.target.id)
          if (!isNaN(messageId)) {
            setVisibleMessageId(messageId)
          }
        }
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: 0 }
    )

    if (typeof window !== 'undefined') {
      // 只观察根留言，不观察回复
      messages.forEach(message => {
        const element = document.getElementById(message.id.toString())
        if (element) {
          visibleObserverRef.current?.observe(element)
        }
      })
    }

    return () => {
      if (visibleObserverRef.current) {
        visibleObserverRef.current.disconnect()
      }
    }
  }, [messages])

  // 更新URL哈希 - 只有用户主动滚动导致 visibleMessageId 变化时才更新
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      // 只有用户滚动导致 visibleMessageId 变化时才更新 URL，不设置默认值
      if (visibleMessageId !== null) {
        window.history.replaceState({}, '', `#${visibleMessageId}`)
      }
    }
  }, [visibleMessageId, messages])

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageForm({ content: e.target.value })
  }, [])

  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>, messageId: number) => {
    setReplyForm(prev => ({ ...prev, [messageId]: e.target.value }))
  }, [])

  // 发布留言
  const handlePublish = useCallback(async () => {
    if (!messageForm.content.trim()) return
    
    setIsSubmitting(true)
    try {
      const ok = await publish(messageForm.content)
      if (ok) setMessageForm({ content: '' })
    } finally {
      setIsSubmitting(false)
    }
  }, [messageForm.content, publish])

  // 回复留言
  const handleReply = useCallback(async (messageId: number) => {
    const replyContent = replyForm[messageId] || ''
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      const ok = await reply(messageId, replyContent)
      if (ok) {
        setReplyForm(prev => {
          const newReplies = { ...prev }
          delete newReplies[messageId]
          return newReplies
        })
        setReplyingMessageId(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [replyForm, reply])

  // 删除留言 - 打开确认弹窗
  const handleDeleteMessage = useCallback(async (id: number) => {
    setConfirmDialog({ isOpen: true, messageId: id })
  }, [])

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    const id = confirmDialog.messageId
    if (id === null) return
    setConfirmDialog({ isOpen: false, messageId: null })
    await remove(id)
    if (replyingMessageId === id) setReplyingMessageId(null)
  }, [confirmDialog.messageId, remove, replyingMessageId])

  // 取消删除
  const handleCancelDelete = useCallback(() => {
    setConfirmDialog({ isOpen: false, messageId: null })
  }, [])

  // 切换回复框
  const toggleReply = useCallback((messageId: number) => {
    setReplyingMessageId(prev => prev === messageId ? null : messageId)
  }, [])

  // 切换回复折叠
  const toggleCollapse = useCallback((rootId: number) => {
    setCollapsedReplies(prev => {
      const next = new Set(prev)
      if (next.has(rootId)) next.delete(rootId)
      else next.add(rootId)
      return next
    })
  }, [])

  // 格式化时间
  const formatDateTime = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  }, [])

  // 渲染单个留言项
  const renderMessageItem = useCallback((message: Message, level = 0, rootId?: number) => {
    const isRootMessage = level === 0
    const hasChildren = message.children && message.children.length > 0
    const collapseKey = rootId || message.id
    const isCollapsed = collapsedReplies.has(collapseKey)
    const isReplying = replyingMessageId === message.id

    return (
      <motion.li
        key={message.id}
        id={isRootMessage ? message.id.toString() : undefined}
        className={`${isRootMessage ? 'msg-root scroll-mt-24' : 'msg-reply msg-reply-indent'}`}
        variants={messageItemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="flex gap-3">
          {/* 头像 */}
          <MsgAvatar 
            src={message.avatar} 
            alt={message.nickname}
            size={isRootMessage ? 'md' : 'sm'}
          />

          {/* 内容区 */}
          <div className="flex-1 min-w-0">
            {/* 头部信息 - 昵称、UP标识、回复对象在同一行 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="msg-nickname">
                {message.nickname}
                {message.parentMessage && (
                  <span className="text-[rgb(var(--msg-muted))]"> 回复 <span className="text-[rgb(var(--msg-accent))]">@{message.parentMessage.nickname}</span></span>
                )}
              </span>
              {message.adminMessage && (
                <span className="msg-up-badge">
                  <Sparkles className="w-3 h-3" />
                  UP
                </span>
              )}
            </div>

            {/* 留言内容 */}
            <p 
              className="msg-content mt-1"
              onClick={() => isMobile && toggleReply(message.id)}
            >
              {message.content}
            </p>

            {/* 操作栏 - B站风格紧凑排列 */}
            <div className="flex items-center gap-2 mt-2">
              <span className="msg-meta">{formatDateTime(message.createTime)}</span>
              
              {!isMobile && (
                <button
                  onClick={() => toggleReply(message.id)}
                  className="msg-action"
                >
                  {isReplying ? '取消' : '回复'}
                </button>
              )}
              
              {administrator && (
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="msg-action hover:text-red-400"
                >
                  <Delete className="w-3 h-3 inline mr-0.5" />
                  删除
                </button>
              )}
            </div>

            {/* 回复输入框 */}
            {isReplying && (
              <div className="msg-reply-box">
                <MsgTextarea
                  value={replyForm[message.id] || ''}
                  onChange={(e) => handleReplyChange(e, message.id)}
                  rows={2}
                  placeholder={`回复 @${message.nickname}...`}
                />
                <div className="flex justify-end mt-2 gap-2">
                  <MsgButton
                    variant="secondary"
                    onClick={() => setReplyingMessageId(null)}
                  >
                    取消
                  </MsgButton>
                  <MsgButton
                    onClick={() => handleReply(message.id)}
                    disabled={isSubmitting || !replyForm[message.id]?.trim()}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {isSubmitting ? '发送中...' : '发送'}
                  </MsgButton>
                </div>
              </div>
            )}

            {/* 子回复列表 */}
            {hasChildren && (
              <div className="mt-0">
                <button
                  onClick={() => toggleCollapse(collapseKey)}
                  className="msg-expand-btn"
                >
                  <span style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                    ▶
                  </span>
                  <span>{message.children!.length} 条回复</span>
                </button>

                {!isCollapsed && (
                  <ul className="mt-0 space-y-1">
                    {message.children!.map(child => 
                      renderMessageItem(child, level + 1, rootId || message.id)
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.li>
    )
  }, [administrator, collapsedReplies, formatDateTime, handleDeleteMessage, handleReply, handleReplyChange, isMobile, isSubmitting, replyForm, replyingMessageId, toggleCollapse, toggleReply])

  return (
    <div className="min-h-screen msg-container relative">
      <BgOverlay />
      
      {/* 右侧滚动导航条 - 桌面端 */}
      <ScrollNavBar 
        messages={messages}
        activeId={visibleMessageId}
        onNavigate={(id) => setVisibleMessageId(id)}
        isVisible={!isMobile && messages.length > 0}
      />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="删除留言"
        message="确定要删除这条留言吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      {/* 黑板角落装饰 - 仅暗色主题显示 */}
      <MsgCorner position="tl" />
      <MsgCorner position="tr" />
      <MsgCorner position="bl" />
      <MsgCorner position="br" />

      <main className={`w-full max-w-3xl mx-auto relative z-10 ${isMobile ? 'px-3' : 'px-6'} py-4`}>
        {/* 标题 */}
        <motion.div 
          className="text-center mb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 
            className="text-2xl md:text-3xl font-bold text-[rgb(var(--msg-text))] msg-title-line" 
            style={{ fontFamily: 'var(--msg-font-decorative)' }}
          >
            📝 留言板
          </h1>
          <p className="msg-meta text-sm mt-2 opacity-80">
            写下你的想法，和大家交流
          </p>
        </motion.div>

        {/* 输入区域 */}
        <motion.div 
          className="msg-input-area p-3 mb-2"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex gap-2">
            {!isMobile && (
              <MsgAvatar 
                src={userInfo?.avatar || ''}
                alt={userInfo?.nickname || '访客'}
                size="lg"
              />
            )}
            <div className="flex-1">
              <MsgTextarea
                value={messageForm.content}
                onChange={handleInputChange}
                rows={isMobile ? 2 : 2}
                placeholder="在这里写下你的留言..."
              />
              <div className="flex justify-end mt-1">
                <MsgButton
                  onClick={handlePublish}
                  disabled={isSubmitting || !messageForm.content.trim()}
                  icon={<Send className="w-4 h-4" />}
                >
                  {isSubmitting ? '发送中...' : '发布'}
                </MsgButton>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 留言列表 */}
        <motion.div 
          className="bg-[rgb(var(--msg-surface))] dark:bg-[rgb(var(--msg-surface)/0.3)] border border-[rgb(var(--msg-border))] dark:border-[rgb(var(--msg-border)/0.5)] rounded-lg px-3 py-1"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* 列表头部 */}
          <div className="msg-header flex items-center justify-between">
            <h2 className="text-base font-semibold text-[rgb(var(--msg-text))]" style={{ fontFamily: 'var(--msg-font)' }}>
              💬 留言列表
            </h2>
            <span className="msg-meta text-xs">
              共 {messages.length} 条
            </span>
          </div>

          {/* 加载状态 */}
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="py-2" key="skeleton">
                {[1, 2].map(item => (
                  <MessageSkeleton key={item} />
                ))}
              </div>
            ) : messages.length > 0 ? (
              <motion.ul
                key="list"
                variants={listContainerVariants}
                initial="initial"
                animate="animate"
              >
                {messages.map(message => renderMessageItem(message))}
              </motion.ul>
            ) : (
              <div key="empty">
                <EmptyState />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}
