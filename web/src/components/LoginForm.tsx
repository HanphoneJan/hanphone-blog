'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeProvider'
import { alertSuccess, alertError } from '@/lib/Alert'
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

  useEffect(() => {
    if (!visible) {
      resetAllForms()
      setIsResetMode(false)
    }
  }, [visible])

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
          loginCity: response.data.user.loginCity
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
    <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-[rgb(var(--overlay)/0.6)]" style={{ zIndex: Z_INDEX.MODAL }}>
        
      <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] w-full max-w-md transform transition-all duration-300 hover:shadow-xl hover:border-[rgb(var(--primary)/0.5)]">
        
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
