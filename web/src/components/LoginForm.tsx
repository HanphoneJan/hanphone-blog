'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeProvider'
import { alertSuccess, alertError } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import md5 from 'md5'
import { getLocationInfo } from '@/lib/location' // 导入server action
import { TIME, VALIDATION, STORAGE_KEYS, DEFAULT_LOCATION, API_CODE, Z_INDEX, ASSETS } from '@/lib/constants'
import { AUTH_LABELS } from '@/lib/labels'

// 登录表单数据类型
interface LoginFormData {
  username: string
  password: string
}

// 重置密码表单数据类型
interface ResetFormData {
  email: string
  captcha: string
  newPassword: string
}

// 错误信息类型
interface LoginErrors {
  username?: string
  password?: string
}

interface ResetErrors {
  email?: string
  captcha?: string
  newPassword?: string
}

interface AuthFormProps {
  visible: boolean
  onClose: () => void
}

const AuthForm: React.FC<AuthFormProps> = ({ visible, onClose }) => {
  const { setUserInfo, setToken, setRefreshToken, onShowRegister, setExpire } = useUser()
  const { theme } = useTheme()
  const [isResetMode, setIsResetMode] = useState(false)

  // 明确声明loginData的类型
  const [loginData, setLoginData] = useState<LoginFormData>({
    username: '',
    password: ''
  })
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({})

  const [resetData, setResetData] = useState<ResetFormData>({
    email: '',
    captcha: '',
    newPassword: ''
  })
  const [resetErrors, setResetErrors] = useState<ResetErrors>({})
  const [countdown, setCountdown] = useState(0)

  const [loading, setLoading] = useState(false)

  // Google OAuth（浏览器端 SDK）
  const handleGoogleCredential = async (credential: string) => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'
      const res = await fetch(`${apiUrl}/oauth/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      })
      const result = await res.json()

      if (result.code === API_CODE.SUCCESS) {
        setUserInfo({
          avatar: result.data.user.avatar || ASSETS.DEFAULT_AVATAR,
          nickname: result.data.user.nickname,
          type: result.data.user.type,
          email: result.data.user.email,
          id: result.data.user.id,
          username: result.data.user.username,
          loginProvince: result.data.user.loginProvince,
          loginCity: result.data.user.loginCity,
          githubId: result.data.user.githubId,
          googleId: result.data.user.googleId,
          oauthProvider: result.data.user.oauthProvider
        })
        setToken(result.data.token)
        setExpire(result.data.expire)

        window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(result.data.token))
        window.localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(result.data.user))
        window.localStorage.setItem(STORAGE_KEYS.EXPIRE, JSON.stringify(result.data.expire))

        alertSuccess(AUTH_LABELS.LOGIN_SUCCESS)
        setTimeout(() => onClose(), TIME.SUCCESS_CLOSE_DELAY)
      } else {
        alertError(result.message || 'Google 登录失败')
      }
    } catch (err) {
      alertError('Google 登录失败')
    } finally {
      setLoading(false)
    }
  }

  const { prompt: promptGoogle, ready: googleReady } = useGoogleAuth()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), TIME.COUNTDOWN_INTERVAL)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 重构后的API调用函数，与项目中保持一致
  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      setLoading(true)
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      }

      if (data) {
        options.body = JSON.stringify(data)
      }

      const res = await fetch(url, options)
      const result = await res.json()

      setLoading(false)
      return result
    } catch (error) {
      console.log(`Error ${method} ${url}:`, error)
      setLoading(false)
      throw error
    }
  }

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLoginData(prev => ({ ...prev, [name]: value }))

    if (loginErrors[name as keyof LoginErrors]) {
      setLoginErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleResetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setResetData(prev => ({ ...prev, [name]: value }))

    if (resetErrors[name as keyof ResetErrors]) {
      setResetErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateLoginForm = (): boolean => {
    const newErrors: LoginErrors = {}

    if (!loginData.username) {
      newErrors.username = '请输入用户名或邮箱'
    } else if (loginData.username.length < VALIDATION.USERNAME_MIN || loginData.username.length > VALIDATION.USERNAME_MAX) {
      newErrors.username = `长度在${VALIDATION.USERNAME_MIN}-${VALIDATION.USERNAME_MAX}个字符之间`
    }

    if (!loginData.password) {
      newErrors.password = '请输入密码'
    } else if (loginData.password.length < VALIDATION.PASSWORD_MIN || loginData.password.length > VALIDATION.PASSWORD_MAX) {
      newErrors.password = `长度在${VALIDATION.PASSWORD_MIN}到${VALIDATION.PASSWORD_MAX}个字符`
    }

    setLoginErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateResetForm = (): boolean => {
    const newErrors: ResetErrors = {}

    if (!resetData.email) {
      newErrors.email = '请输入邮箱'
    } else if (!VALIDATION.EMAIL_REGEX_SIMPLE.test(resetData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!resetData.captcha) {
      newErrors.captcha = '请输入验证码'
    } else if (resetData.captcha.length !== VALIDATION.CAPTCHA_LENGTH) {
      newErrors.captcha = `验证码长度为${VALIDATION.CAPTCHA_LENGTH}位`
    }

    if (!resetData.newPassword) {
      newErrors.newPassword = '请输入新密码'
    } else if (resetData.newPassword.length < VALIDATION.PASSWORD_MIN || resetData.newPassword.length > VALIDATION.PASSWORD_MAX_OPTIONAL) {
      newErrors.newPassword = `密码长度在${VALIDATION.PASSWORD_MIN}到${VALIDATION.PASSWORD_MAX_OPTIONAL}个字符`
    }

    setResetErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 修改handleLoginSubmit方法中对locationInfo的判断逻辑
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateLoginForm()) return

    // 提交时才获取地理位置
    let loginLocation: {
      loginProvince: string
      loginCity: string
      loginLat: number
      loginLng: number
    } = {
      loginProvince: DEFAULT_LOCATION.loginProvince,
      loginCity: DEFAULT_LOCATION.loginCity,
      loginLat: DEFAULT_LOCATION.loginLat,
      loginLng: DEFAULT_LOCATION.loginLng
    }

    try {
      const location = await getLocationInfo()
      loginLocation = {
        loginProvince: location.loginProvince,
        loginCity: location.loginCity,
        loginLat: location.loginLat,
        loginLng: location.loginLng
      }
    } catch (error) {
      console.log('获取地理位置失败，使用默认值:', error)
    }

    try {
      const requestPayload = {
        username: loginData.username,
        password: md5(loginData.password),
        ...loginLocation
      }

      const response = await fetchData(ENDPOINTS.LOGIN, 'POST', requestPayload)

      if (response.code === API_CODE.SUCCESS) {
        setUserInfo({
          avatar: response.data.user.avatar || ASSETS.DEFAULT_AVATAR,
          nickname: response.data.user.nickname,
          type: response.data.user.type,
          email: response.data.user.email,
          id: response.data.user.id,
          username: response.data.user.username,
          loginProvince: response.data.user.loginProvince,
          loginCity: response.data.user.loginCity,
          githubId: response.data.user.githubId,
          oauthProvider: response.data.user.oauthProvider
        })
        setToken(response.data.token)
        setRefreshToken(response.data.refreshToken)
        setExpire(response.data.expire)

        window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(response.data.token))
        window.localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(response.data.user))
        window.localStorage.setItem(STORAGE_KEYS.EXPIRE, JSON.stringify(response.data.expire))

        alertSuccess(AUTH_LABELS.LOGIN_SUCCESS)

        setTimeout(() => {
          onClose()
        }, TIME.SUCCESS_CLOSE_DELAY)
      } else {
        alertError(response.message || '登录失败')
      }
    } catch (err) {
      alertError(AUTH_LABELS.LOGIN_FAIL)
      console.log('登录错误' + err)
    }
  }

  const getCaptcha = async () => {
    if (!resetData.email) {
      setResetErrors(prev => ({ ...prev, email: '请输入邮箱' }))
      return
    }

    if (!VALIDATION.EMAIL_REGEX_SIMPLE.test(resetData.email)) {
      setResetErrors(prev => ({ ...prev, email: '请输入有效的邮箱地址' }))
      return
    }

    try {
      const response = await fetchData(ENDPOINTS.USER.SEND_CAPTCHA, 'POST', {
        email: resetData.email
      })
      if (response.code === API_CODE.SUCCESS) {
        alertSuccess(AUTH_LABELS.CAPTCHA_SENT)
        setCountdown(VALIDATION.CAPTCHA_COUNTDOWN)
      } else {
        alertError(response.message || '获取验证码失败')
      }
    } catch (error) {
      alertError(AUTH_LABELS.CAPTCHA_FAIL)
      console.log('发送验证码错误' + error)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateResetForm()) return

    try {
      const resetFormData = {
        email: resetData.email,
        captcha: resetData.captcha,
        newPassword: md5(resetData.newPassword)
      }

      const response = await fetchData(ENDPOINTS.USER.FORGET_PASSWORD, 'POST', resetFormData)
      if (response.code === API_CODE.SUCCESS) {
        alertSuccess(AUTH_LABELS.PASSWORD_RESET_SUCCESS)
        setTimeout(() => {
          setIsResetMode(false)
        }, TIME.PASSWORD_RESET_DELAY)
      } else {
        alertError(response.message || '密码重置失败')
      }
    } catch (error) {
      alertError(AUTH_LABELS.PASSWORD_RESET_FAIL)
      console.log('重置密码失败' + error)
    }
  }

  const resetAllForms = () => {
    setLoginData({
      username: '',
      password: ''
    })
    setLoginErrors({})

    setResetData({
      email: '',
      captcha: '',
      newPassword: ''
    })
    setResetErrors({})
    setCountdown(0)

    setLoading(false)
  }

  if (!visible) return null

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <ModalOverlay onClick={onClose} />

      <div className="relative z-10 bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] w-full max-w-md transform transition-all duration-300 hover:shadow-xl hover:border-[rgb(var(--primary)/0.5)]">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-lg font-semibold text-[rgb(var(--primary))]">
            {isResetMode ? '找回密码' : '登录'}
          </h2>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={isResetMode ? handleResetSubmit : handleLoginSubmit} className="p-6">
          {isResetMode ? (
            <>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
                >
                  邮箱
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={resetData.email}
                  onChange={handleResetInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    resetErrors.email
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                  }`}
                  placeholder="请输入注册邮箱"
                />
                {resetErrors.email && (
                  <p className="mt-1 text-sm text-danger dark:text-danger">{resetErrors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="captcha"
                  className={`block text-sm font-medium ${theme === 'cyber' ? 'text-cyan-400' : 'text-text'} mb-1`}
                >
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="captcha"
                    name="captcha"
                    value={resetData.captcha}
                    onChange={handleResetInputChange}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                      resetErrors.captcha
                        ? 'border-danger focus:ring-danger/50'
                        : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                    }`}
                    placeholder="请输入验证码"
                  />
                  <button
                    type="button"
                    onClick={getCaptcha}
                    disabled={loading || countdown > 0}
                    className="px-4 py-2 rounded-md hover:disabled:opacity-50 transition-colors whitespace-nowrap bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]"
                  >
                    {countdown > 0 ? `重新发送(${countdown}s)` : '获取验证码'}
                  </button>
                </div>
                {resetErrors.captcha && (
                  <p className="mt-1 text-sm text-danger dark:text-danger">
                    {resetErrors.captcha}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
                >
                  新密码
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={resetData.newPassword}
                  onChange={handleResetInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    resetErrors.newPassword
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                  }`}
                  placeholder="请输入新密码"
                />
                {resetErrors.newPassword && (
                  <p className="mt-1 text-sm text-danger dark:text-danger">
                    {resetErrors.newPassword}
                  </p>
                )}
              </div>
            </>
            ) : (
            <>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
                >
                  用户名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    loginErrors.username
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                  }`}
                  placeholder="请输入用户名"
                />
                {loginErrors.username && (
                  <p className="mt-1 text-sm text-danger dark:text-danger">
                    {loginErrors.username}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
                >
                  密码
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    loginErrors.password
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                  }`}
                  placeholder="请输入密码"
                />
                {loginErrors.password && (
                  <p className="mt-1 text-sm text-danger dark:text-danger">
                    {loginErrors.password}
                  </p>
                )}
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgb(var(--border))]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[rgb(var(--card))] px-2 text-[rgb(var(--text-muted))]">
                    或者
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'
                  window.location.href = `${apiUrl}/oauth/github/authorize`
                }}
                className="w-full py-2 rounded-md flex items-center justify-center gap-2 border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors mb-3"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                使用 GitHub 登录
              </button>

              <button
                type="button"
                onClick={() => promptGoogle(handleGoogleCredential)}
                disabled={!googleReady || loading}
                className="w-full py-2 rounded-md flex items-center justify-center gap-2 border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors mb-3 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                使用 Google 登录
              </button>
            </>
          )}
        </form>
        <div className="px-6 py-3 rounded-b-xl">
          <button
            type="submit"
            onClick={e => (isResetMode ? handleResetSubmit(e) : handleLoginSubmit(e))}
            disabled={loading}
            className="w-full py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary)/0.5)] disabled:opacity-50 transition-colors mb-3 font-semibold text-white bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.9)]"
          >
            {loading
              ? isResetMode
                ? '重置中...'
                : '登录中...'
              : isResetMode
              ? '重置密码'
              : '登录'}
          </button>

          {isResetMode ? (
            <p className="text-sm text-[rgb(var(--text-muted))] text-center">
              想起密码了？{' '}
              <button
                onClick={() => setIsResetMode(false)}
                className="font-medium text-[rgb(var(--primary))] hover:text-[rgb(var(--primary)/0.8)]"
              >
                立即登录
              </button>
            </p>
          ) : (
            <div className="flex justify-center items-center gap-6 text-sm text-[rgb(var(--text-muted))]">
              <p>
                还没有账号？{' '}
                <button
                  onClick={() => {
                    onClose()
                    onShowRegister()
                  }}
                  className="font-medium text-[rgb(var(--primary))] hover:text-[rgb(var(--primary)/0.8)]"
                >
                  立即注册
                </button>
              </p>
              <span className="text-[rgb(var(--border))]">|</span>
              <p>
                忘记密码？{' '}
                <button
                  onClick={() => setIsResetMode(true)}
                  className="font-medium text-[rgb(var(--primary))] hover:text-[rgb(var(--primary)/0.8)]"
                >
                  找回密码
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}

export default AuthForm
