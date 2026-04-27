'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import md5 from 'md5'
import { ENDPOINTS } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { alertSuccess, alertError } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
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
