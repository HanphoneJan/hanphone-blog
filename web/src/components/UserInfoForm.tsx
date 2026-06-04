'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, Loader2, Eye, EyeOff, Link, Unlink } from 'lucide-react'
import md5 from 'md5'
import { ENDPOINTS } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { alertSuccess, alertError } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import Compressor from 'compressorjs'
import { TIME, VALIDATION, IMAGE, Z_INDEX, API_CODE, USER_TYPE } from '@/lib/constants'
import { AUTH_LABELS } from '@/lib/labels'

// 用户数据类型定义
interface User {
  nickname: string
  email: string
  password?: string
  avatar: string
  captcha?: string
}

// 表单数据类型定义
interface FormData {
  nickname: string
  email: string
  password: string
  captcha: string
}

// 错误信息类型
interface FormErrors {
  nickname?: string
  email?: string
  password?: string
  captcha?: string
}

interface UserInfoFormProps {
  visible: boolean
  onClose: () => void
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ visible, onClose }) => {
  const { userInfo, token, updateUserInfo } = useUser()
  const [formData, setFormData] = useState<FormData>({
    nickname: '',
    email: '',
    password: '',
    captcha: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [emailChanged, setEmailChanged] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 当打开表单时，加载当前用户信息
  useEffect(() => {
    if (visible && userInfo) {
      setFormData({
        nickname: userInfo.nickname || '',
        email: userInfo.email || '',
        password: '',
        captcha: ''
      })
      setAvatarUrl(userInfo.avatar || '')
      setEmailChanged(false)
    }
  }, [visible, userInfo])

  // 当visible变化时重置表单错误
  useEffect(() => {
    if (!visible) {
      setErrors({})
      setCountdown(0)
      setEmailChanged(false)
    }
  }, [visible])

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), TIME.COUNTDOWN_INTERVAL)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }

    // 检测邮箱是否被修改（且用户不是管理员）
    if (name === 'email' && userInfo?.email && userInfo?.type !== USER_TYPE.ADMIN_STRING && value !== userInfo.email) {
      setEmailChanged(true)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.nickname) {
      newErrors.nickname = '请输入昵称'
    } else if (formData.nickname.length < VALIDATION.NICKNAME_MIN || formData.nickname.length > VALIDATION.NICKNAME_MAX_PROFILE) {
      newErrors.nickname = `长度在${VALIDATION.NICKNAME_MIN}-${VALIDATION.NICKNAME_MAX_PROFILE}个字符之间`
    }

    if (!formData.email) {
      newErrors.email = '请输入邮箱'
    } else if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (formData.password && (formData.password.length < VALIDATION.PASSWORD_MIN || formData.password.length > VALIDATION.PASSWORD_MAX_OPTIONAL)) {
      newErrors.password = `密码长度在${VALIDATION.PASSWORD_MIN}到${VALIDATION.PASSWORD_MAX_OPTIONAL}个字符`
    }

    // 如果邮箱被修改且用户不是管理员，需要验证码
    if (emailChanged && userInfo?.type !== USER_TYPE.ADMIN_STRING) {
      if (!formData.captcha) {
        newErrors.captcha = '请输入验证码'
      } else if (formData.captcha.length !== VALIDATION.CAPTCHA_LENGTH) {
        newErrors.captcha = `验证码长度为${VALIDATION.CAPTCHA_LENGTH}位`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = IMAGE.DEFAULT_EXTENSION
    const newFileName = `${originalName}.${fileExtension}`

    new Compressor(file, {
      quality: IMAGE.COMPRESS_QUALITY,
      maxWidth: IMAGE.MAX_WIDTH,
      maxHeight: IMAGE.MAX_HEIGHT,
      mimeType: IMAGE.DEFAULT_MIME_TYPE,
      convertSize: IMAGE.CONVERT_SIZE,
      success: async compressedResult => {
        try {
          setUploading(true)
          const compressedFile = new File([compressedResult], newFileName, {
            type: IMAGE.DEFAULT_MIME_TYPE,
            lastModified: Date.now()
          })

          const formDataUpload = new FormData()
          formDataUpload.append('avatar', compressedFile)

          const response = await fetch(ENDPOINTS.FILE.AVATAR_UPLOAD, {
            method: 'POST',
            body: formDataUpload
          })

          const data = await response.json()
          if (data?.url) {
            setAvatarUrl(data?.url)
            alertSuccess(AUTH_LABELS.AVATAR_UPLOAD_SUCCESS)
          } else {
            alertError(AUTH_LABELS.AVATAR_UPLOAD_FAIL)
          }
        } catch (error) {
          console.error('上传失败:', error)
          alertError(AUTH_LABELS.AVATAR_UPLOAD_FAIL)
        } finally {
          setUploading(false)
        }
      },
      error: err => {
        console.error('图片压缩失败:', err)
        alertError(AUTH_LABELS.AVATAR_COMPRESS_FAIL)
        setUploading(false)
      }
    })
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
  }

  // 发送验证码
  const getCaptcha = async () => {
    if (!formData.email) {
      setErrors(prev => ({ ...prev, email: '请输入邮箱' }))
      return
    }

    if (!VALIDATION.EMAIL_REGEX_SIMPLE.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: '请输入有效的邮箱地址' }))
      return
    }

    try {
      const response = await fetch(ENDPOINTS.USER.SEND_CAPTCHA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })

      const result = await response.json()
      if (result.code === API_CODE.SUCCESS) {
        alertSuccess(AUTH_LABELS.CAPTCHA_SENT)
        setCountdown(VALIDATION.CAPTCHA_COUNTDOWN)
      } else {
        alertError(result.message || '获取验证码失败')
      }
    } catch (error) {
      alertError(AUTH_LABELS.CAPTCHA_FAIL)
      console.error('发送验证码错误:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!token || !userInfo?.id) {
      alertError(AUTH_LABELS.USER_INFO_INCOMPLETE)
      return
    }

    try {
      setSubmitting(true)

      const user: User = {
        nickname: formData.nickname,
        email: formData.email,
        avatar: avatarUrl
      }

      // 只有当密码字段不为空时才添加密码并进行 MD5 加密
      if (formData.password) {
        user.password = md5(formData.password)
      }

      // 构建请求体：userId、user对象，如果邮箱被修改且不是管理员，则包含验证码
      const requestBody: any = {
        userId: userInfo.id,
        user: user
      }

      // 如果邮箱被修改且用户不是管理员，添加验证码到根级别
      if (emailChanged && userInfo?.type !== USER_TYPE.ADMIN_STRING) {
        requestBody.captcha = formData.captcha
      }

      const response = await fetch(`${ENDPOINTS.USER.UPDATE_USER_INFO}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.flag && result.code === API_CODE.SUCCESS) {
        alertSuccess(AUTH_LABELS.PROFILE_UPDATE_SUCCESS)

        // 更新上下文中的用户信息
        updateUserInfo({
          nickname: result.data.nickname,
          email: result.data.email,
          avatar: result.data.avatar
        })

        setTimeout(() => {
          onClose()
        }, TIME.SUCCESS_CLOSE_DELAY)
      } else {
        alertError(result.message || '更新用户信息失败')
      }
    } catch (error) {
      console.error('更新用户信息错误:', error)
      alertError(AUTH_LABELS.PROFILE_UPDATE_FAIL)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBindOauth = (provider: string) => {
    if (provider === 'google') {
      promptGoogle(onGoogleBindCredential)
      return
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'
    window.location.href = `${apiUrl}/oauth/${provider}/authorize`
  }

  // Google 绑定回调：解码 JWT 提取 Google ID，调用 bind API
  const onGoogleBindCredential = async (credential: string) => {
    if (!token || !userInfo?.id) return
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]))
      const googleId = payload.sub
      if (!googleId) {
        alertError('无法获取 Google 账号信息')
        return
      }

      setSubmitting(true)
      const response = await fetch(ENDPOINTS.USER.BIND_OAUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token
        },
        body: JSON.stringify({ userId: userInfo.id, provider: 'google', providerId: googleId })
      })
      const result = await response.json()
      if (result.code === API_CODE.SUCCESS) {
        const merged = result.data?.merged
        const mergedFrom = result.data?.mergedFromNickname
        if (merged && mergedFrom) {
          alertSuccess(`绑定成功，已合并账号「${mergedFrom}」的数据`)
        } else {
          alertSuccess('Google 账号绑定成功')
        }
        updateUserInfo({ googleId, oauthProvider: 'google' })
      } else {
        alertError(result.message || '绑定失败')
      }
    } catch (error) {
      alertError('绑定请求失败')
    } finally {
      setSubmitting(false)
    }
  }

  const { prompt: promptGoogle } = useGoogleAuth()

  const handleUnbindOauth = async (provider: string) => {
    if (!token || !userInfo?.id) {
      alertError('请先登录')
      return
    }
    const label = provider === 'google' ? 'Google' : 'GitHub'
    if (!confirm(`确定要解除 ${label} 绑定吗？`)) return

    try {
      setSubmitting(true)
      const response = await fetch(ENDPOINTS.USER.UNBIND_OAUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token
        },
        body: JSON.stringify({ userId: userInfo.id, provider })
      })
      const result = await response.json()
      if (result.code === API_CODE.SUCCESS) {
        alertSuccess(`解除 ${label} 绑定成功`)
        if (provider === 'google') {
          updateUserInfo({ googleId: undefined })
        } else {
          updateUserInfo({ githubId: undefined })
        }
      } else {
        alertError(result.message || '解绑失败')
      }
    } catch (error) {
      alertError('解绑请求失败')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nickname: userInfo?.nickname || '',
      email: userInfo?.email || '',
      password: '',
      captcha: ''
    })
    setAvatarUrl(userInfo?.avatar || '')
    setErrors({})
    setEmailChanged(false)
    setCountdown(0)
  }

  if (!visible) return null

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] w-full max-w-md transform transition-all duration-300 hover:shadow-xl hover:border-[rgb(var(--primary)/0.5)]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[rgb(var(--border))]">
          <h3 className="text-lg font-semibold text-[rgb(var(--primary))]">修改个人信息</h3>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
            >
              昵称
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={formData.nickname}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                errors.nickname
                  ? 'border-danger focus:ring-danger/50'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
              }`}
            />
            {errors.nickname && (
              <p className="mt-1 text-sm text-danger dark:text-danger">{errors.nickname}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
            >
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                errors.email
                  ? 'border-danger focus:ring-danger/50'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger dark:text-danger">{errors.email}</p>
            )}
          </div>

          {/* 验证码字段：只有当邮箱被修改时才显示 */}
          {emailChanged && (
            <div className="mb-4">
              <label
                htmlFor="captcha"
                className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
              >
                邮箱验证码
              </label>
              <div className="flex gap-2">
                <input
                  id="captcha"
                  name="captcha"
                  type="text"
                  value={formData.captcha}
                  onChange={handleInputChange}
                  placeholder={`请输入${VALIDATION.CAPTCHA_LENGTH}位验证码`}
                  maxLength={VALIDATION.CAPTCHA_LENGTH}
                  disabled={submitting}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    errors.captcha
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={getCaptcha}
                  disabled={submitting || countdown > 0}
                  className="px-4 py-2 rounded-md hover:disabled:opacity-50 transition-colors whitespace-nowrap bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `重新发送(${countdown}s)` : '获取验证码'}
                </button>
              </div>
              {errors.captcha && (
                <p className="mt-1 text-sm text-danger dark:text-danger">{errors.captcha}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
            >
              新密码（可选）
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="不修改请留空"
                autoComplete="new-password"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-1 ${
                  errors.password
                    ? 'border-danger focus:ring-danger/50'
                    : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
              >
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-danger dark:text-danger">{errors.password}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
              头像
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading || submitting}
                className="hidden"
                id="avatar-upload"
              />

              <label
                htmlFor="avatar-upload"
                className={`cursor-pointer ${uploading ? 'opacity-70' : ''}`}
              >
                {avatarUrl ? (
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border border-[rgb(var(--border))]">
                    <Image
                      src={avatarUrl}
                      alt="用户头像"
                      width={IMAGE.AVATAR_SIZE}
                      height={IMAGE.AVATAR_SIZE}
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemoveAvatar()
                      }}
                      className="absolute top-0 right-0 bg-black/50 text-white p-1 hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-md border-2 border-dashed flex flex-col items-center justify-center transition-colors border-[rgb(var(--border)/0.4)] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]">
                    <X className="h-6 w-6 mb-1" />
                    <span className="text-xs">上传头像</span>
                  </div>
                )}
              </label>

              {uploading && (
                <div className="absolute top-0 left-0 w-full h-full bg-[rgb(var(--bg)/0.7)] flex items-center justify-center rounded-md">
                  <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--primary))]" />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              图片将自动压缩为JPEG格式，最大尺寸{IMAGE.MAX_WIDTH}x{IMAGE.MAX_HEIGHT}px
            </p>
          </div>

          {/* OAuth 账号绑定 */}
          <div className="mb-6 pt-4 border-t border-[rgb(var(--border))]">
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-3">
              第三方账号
            </label>

            {/* GitHub */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgb(var(--text))' }}>
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm text-[rgb(var(--text))]">GitHub</span>
              </div>
              {userInfo?.githubId ? (
                <button
                  type="button"
                  onClick={() => handleUnbindOauth('github')}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  解绑
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBindOauth('github')}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Link className="h-3.5 w-3.5" />
                  绑定
                </button>
              )}
            </div>

            {/* Google */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm text-[rgb(var(--text))]">Google</span>
              </div>
              {userInfo?.googleId ? (
                <button
                  type="button"
                  onClick={() => handleUnbindOauth('google')}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  解绑
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBindOauth('google')}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Link className="h-3.5 w-3.5" />
                  绑定
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="px-6 py-3 bg-[rgb(var(--card))] flex justify-end rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[rgb(var(--border))] rounded-md hover:bg-[rgb(var(--hover))] mr-2 transition-colors text-[rgb(var(--text))]"
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="submit"
            onClick={e => handleSubmit(e)}
            disabled={uploading || submitting}
            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary)/0.5)] disabled:opacity-50 transition-colors font-semibold text-white bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.9)]"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
            保存
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}

export default UserInfoForm
