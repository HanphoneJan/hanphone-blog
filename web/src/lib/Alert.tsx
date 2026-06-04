'use client'

import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client' // 从react-dom/client导入createRoot
import { X, Check, AlertCircle, Info } from 'lucide-react'
import { TIME, Z_INDEX } from './constants'
// 定义提示类型
type AlertType = 'success' | 'error' | 'warning' | 'info'

// 提示配置
interface AlertOptions {
  type?: AlertType
  duration?: number
}

// 全局状态管理
let currentAlert: {
  visible: boolean
  message: string
  type: AlertType
  duration: number
  hide: () => void
  setters: {
    setVisible: (visible: boolean) => void
    setMessage: (message: string) => void
    setType: (type: AlertType) => void
  }
  timer: NodeJS.Timeout | null
} | null = null

// 提示组件
const AlertComponent = () => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<AlertType>('info')
  const [duration] = useState(TIME.ALERT_DURATION)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  // 初始化全局状态引用（只执行一次）
  useEffect(() => {
    if (!currentAlert) {
      currentAlert = {
        visible,
        message,
        type,
        duration,
        hide,
        setters: { setVisible, setMessage, setType },
        timer: null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 隐藏提示
  const hide = () => {
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
    }
    setVisible(false)
    if (currentAlert) {
      currentAlert.visible = false
      currentAlert.timer = null
    }
  }

  // 确保组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [timer])

  return (
    <div
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-in-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-20px] pointer-events-none'
      }`}
      style={{ zIndex: Z_INDEX.ALERT }}
    >
      <div
        className="max-w-lg w-full p-5 rounded-lg shadow-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] relative"
      >
        {/* 关闭按钮 */}
        <button
          onClick={hide}
          className="absolute top-3 right-3 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] p-1 transition-colors hover:bg-[rgb(var(--hover))] rounded-full"
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 图标和文字 */}
        <div className="flex items-start gap-4 pr-8">
          {/* 图标 */}
          <div
            className={`shrink-0 ${
              type === 'success'
                ? 'text-[rgb(var(--success))]'
                : type === 'error'
                ? 'text-[rgb(var(--danger))]'
                : type === 'warning'
                ? 'text-[rgb(var(--primary))]'
                : 'text-[rgb(var(--primary))]'
            }`}
          >
            {type === 'success' && <Check className="h-5 w-5" />}
            {type === 'error' && <AlertCircle className="h-5 w-5" />}
            {type === 'warning' && <AlertCircle className="h-5 w-5" />}
            {type === 'info' && <Info className="h-5 w-5" />}
          </div>

          {/* 消息文本 */}
          <p className="flex-1 text-sm text-[rgb(var(--text))]">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

// 初始化提示组件，将其挂载到body
const initializeAlert = () => {
  if (!document.getElementById('alert-container')) {
    const container = document.createElement('div')
    container.id = 'alert-container'
    document.body.appendChild(container)
    createRoot(container).render(<AlertComponent />)
  }
}

// 显示提示的函数
export const showAlert = (message: string, options: AlertOptions = {}) => {
  // 确保组件已初始化
  initializeAlert()

  if (!currentAlert) {
    // 给组件一点时间初始化
    setTimeout(() => showAlert(message, options), TIME.ALERT_INIT_DELAY)
    return
  }

  // 清除之前的定时器
  if (currentAlert.timer) {
    clearTimeout(currentAlert.timer)
  }

  // 更新提示内容
  currentAlert.setters.setMessage(message)
  currentAlert.setters.setType(options.type || 'info')
  currentAlert.setters.setVisible(true)

  // 设置自动关闭定时器
  const duration = options.duration ?? TIME.ALERT_DURATION
  const newTimer = setTimeout(() => {
    currentAlert?.setters.setVisible(false)
    if (currentAlert) {
      currentAlert.timer = null
    }
  }, duration)

  currentAlert.timer = newTimer
}

// 隐藏提示的函数
export const hideAlert = () => {
  currentAlert?.hide()
}

// 特定类型的提示快捷方法
export const alertSuccess = (message: string, duration?: number) => {
  showAlert(message, { type: 'success', duration })
}

export const alertError = (message: string, duration?: number) => {
  showAlert(message, { type: 'error', duration })
}

export const alertWarning = (message: string, duration?: number) => {
  showAlert(message, { type: 'warning', duration })
}

export const alertInfo = (message: string, duration?: number) => {
  showAlert(message, { type: 'info', duration })
}
