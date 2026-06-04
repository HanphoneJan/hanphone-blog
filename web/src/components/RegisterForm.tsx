'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeProvider'
import { alertSuccess, alertError } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import md5 from 'md5'
import Compressor from 'compressorjs' // 引入compressorjs
import { TIME, VALIDATION, IMAGE, Z_INDEX, USER_TYPE, API_CODE } from '@/lib/constants'
import { AUTH_LABELS } from '@/lib/labels'

// 用户数据类型定义
interface User {
  username: string
  nickname: string
  avatar: string
  email: string
  password: string
  type: number
  loginProvince?: string
  loginCity?: string
  loginLat?: number
  loginLng?: number
}

// 表单数据类型定义
interface FormData {
  nickname: string
  username: string
  password: string
  email: string
}

// 错误信息类型
interface FormErrors {
  nickname?: string
  username?: string
  password?: string
  email?: string
}

interface RegisterFormProps {
  visible: boolean
  onClose: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ visible, onClose }) => {
  const { setUserInfo, setToken } = useUser()
  const { theme } = useTheme()
  const [formData, setFormData] = useState<FormData>({
    nickname: '',
    username: '',
    password: '',
    email: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null) // 上传input的ref

  // 当visible变化时重置表单
  useEffect(() => {
    if (!visible) {
      resetForm()
    }
  }, [visible])

  // 修复Headers类型错误的API请求函数
  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      // 初始化选项对象
      const options: RequestInit = { method }

      // 处理请求头
      if (!(data instanceof FormData)) {
        options.headers = {
          'Content-Type': 'application/json'
        }
      }

      // 处理请求体
      if (data) {
        // 上传文件时特殊处理
        if (data instanceof FormData) {
          delete options.headers
          options.body = data
        } else {
          options.body = JSON.stringify(data)
        }
      }

      const res = await fetch(url, options)
      console.log('res' + res)
      const result = await res.json()

      return result
    } catch (error) {
      console.log(`Error ${method} ${url}:`, error)
      throw error
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.nickname) {
      newErrors.nickname = '请输入昵称'
    } else if (formData.nickname.length < VALIDATION.NICKNAME_MIN || formData.nickname.length > VALIDATION.NICKNAME_MAX) {
      newErrors.nickname = `长度在${VALIDATION.NICKNAME_MIN}-${VALIDATION.NICKNAME_MAX}个字符之间`
    }

    if (!formData.username) {
      newErrors.username = '请输入用户名'
    } else if (formData.username.length < VALIDATION.USERNAME_MIN || formData.username.length > VALIDATION.USERNAME_MAX) {
      newErrors.username = `长度在${VALIDATION.USERNAME_MIN}-${VALIDATION.USERNAME_MAX}个字符之间`
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < VALIDATION.PASSWORD_MIN || formData.password.length > VALIDATION.PASSWORD_MAX) {
      newErrors.password = `长度在${VALIDATION.PASSWORD_MIN}到${VALIDATION.PASSWORD_MAX}个字符`
    }

    if (!formData.email) {
      newErrors.email = '请输入邮箱'
    } else if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    // 保存原始文件名（不含扩展名）和扩展名
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = IMAGE.DEFAULT_EXTENSION
    const newFileName = `${originalName}.${fileExtension}`

    // 使用Compressor压缩图片
    new Compressor(file, {
      quality: IMAGE.COMPRESS_QUALITY,
      maxWidth: IMAGE.MAX_WIDTH,
      maxHeight: IMAGE.MAX_HEIGHT,
      mimeType: IMAGE.DEFAULT_MIME_TYPE,
      convertSize: IMAGE.CONVERT_SIZE,
      success: async compressedResult => {
        try {
          setUploading(true)

          // 将压缩后的blob转换为File对象，并保持原始文件名（修改扩展名为jpeg）
          const compressedFile = new File([compressedResult], newFileName, {
            type: IMAGE.DEFAULT_MIME_TYPE,
            lastModified: Date.now()
          })

          const formData = new FormData()
          formData.append('avatar', compressedFile) // 使用带有原始文件名的压缩文件
          const data = await fetchData(ENDPOINTS.FILE.AVATAR_UPLOAD, 'POST', formData)
          if (data?.url) {
            setAvatarUrl(data?.url)
            alertSuccess(AUTH_LABELS.AVATAR_UPLOAD_SUCCESS)
          } else {
            alertError(AUTH_LABELS.AVATAR_UPLOAD_FAIL)
          }
        } catch (error) {
          console.log('上传失败:', error)
          alertError(AUTH_LABELS.AVATAR_UPLOAD_FAIL)
        } finally {
          setUploading(false)
          if (uploadRef.current) uploadRef.current.value = ''
        }
      },
      error: err => {
        console.error('图片压缩失败:', err)
        alertError(AUTH_LABELS.AVATAR_COMPRESS_FAIL)
        setUploading(false)
        if (uploadRef.current) uploadRef.current.value = ''
      }
    })
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const encryptedPassword = md5(formData.password)
      const user: User = {
        ...formData,
        password: encryptedPassword,
        avatar: avatarUrl,
        type: USER_TYPE.NORMAL
      }

      const response = await fetchData(ENDPOINTS.REGISTER, 'POST', user)

      alertSuccess(AUTH_LABELS.REGISTER_SUCCESS)

      // 使用context的setter方法更新用户状态
      setToken(response.data.token)
      setUserInfo(response.data.user)

      // 注册成功后关闭表单
      setTimeout(() => {
        onClose()
      }, TIME.SUCCESS_CLOSE_DELAY)
    } catch (error) {
      console.log('注册错误' + error)
      alertError(AUTH_LABELS.REGISTER_FAIL)
    }
  }

  const resetForm = () => {
    setFormData({
      nickname: '',
      username: '',
      password: '',
      email: ''
    })
    setAvatarUrl('')
    setErrors({})
  }

  if (!visible) return null

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] w-full max-w-md transform transition-all duration-300 hover:shadow-xl hover:border-[rgb(var(--primary)/0.5)]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[rgb(var(--border))]">
          <h3 className="text-lg font-semibold text-[rgb(var(--primary))]">请注册</h3>
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
              htmlFor="username"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
            >
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                errors.username
                  ? 'border-danger focus:ring-danger/50'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-danger dark:text-danger">{errors.username}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-1"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                errors.password
                  ? 'border-danger focus:ring-danger/50'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary)/0.5)]'
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-danger dark:text-danger">{errors.password}</p>
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
              头像
            </label>
            <div className="relative">
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
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
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-md border-2 border-dashed flex flex-col items-center justify-center transition-colors border-[rgb(var(--border)/0.4)] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]">
                    <Plus className="h-6 w-6 mb-1" />
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
              图片将自动压缩为JPEG格式，最大尺寸{IMAGE.MAX_WIDTH}x{IMAGE.MAX_HEIGHT}px，保持原始文件名
            </p>
          </div>
        </form>

        <div className="px-6 py-3 bg-[rgb(var(--card))] flex justify-end rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[rgb(var(--border))] rounded-md hover:bg-[rgb(var(--hover))] mr-2 transition-colors text-[rgb(var(--text))]"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={e => handleSubmit(e)}
            disabled={uploading}
            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary)/0.5)] disabled:opacity-50 transition-colors font-semibold text-white bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.9)]"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
            注册
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}

export default RegisterForm
