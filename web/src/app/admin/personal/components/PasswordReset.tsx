'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import md5 from 'md5'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { ADMIN_PERSONAL_LABELS } from '@/lib/labels'

interface PasswordResetProps {
  userId: number
  loading: boolean
  setLoading: (loading: boolean) => void
  onClose: () => void
}

export function PasswordReset({ userId, loading, setLoading, onClose }: PasswordResetProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validatePassword = () => {
    if (!newPassword) {
      setPasswordError('请输入新密码')
      return false
    }

    if (newPassword.length < 6) {
      setPasswordError('密码长度不能少于6位')
      return false
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致')
      return false
    }

    return true
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'newPassword') {
      setNewPassword(value)
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value)
    }

    if (passwordError) {
      setPasswordError('')
    }
  }

  const resetPassword = async () => {
    if (!validatePassword()) {
      return
    }

    try {
      setLoading(true)
      const res = await apiClient({
        url: ENDPOINTS.USER.RESET_PASSWORD,
        method: 'POST',
        data: {
          userId,
          newPassword: md5(newPassword)
        }
      })

      if (res.data.code === 200) {
        showAlert(ADMIN_PERSONAL_LABELS.PASSWORD_RESET_SUCCESS)
        onClose()
      } else {
        showAlert(res.data.message || ADMIN_PERSONAL_LABELS.PASSWORD_RESET_FAIL)
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      showAlert(ADMIN_PERSONAL_LABELS.PASSWORD_RESET_FAIL)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <ModalOverlay onClick={onClose} />
      <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-[rgb(var(--border))] flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[rgb(var(--primary))]">重置密码</h3>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm text-[rgb(var(--text))] mb-1">
              新密码
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
              placeholder="请输入新密码"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-[rgb(var(--text))] mb-1">
              确认密码
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
              placeholder="请再次输入新密码"
            />
          </div>

          {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
        </div>

        <div className="p-4 border-t border-[rgb(var(--border))] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors"
          >
            取消
          </button>
          <button
            onClick={resetPassword}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition duration-300 ${
              loading
                ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                : 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white'
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            确认重置
          </button>
        </div>
      </div>
    </div>
  )
}
