'use client'

import Image from 'next/image'
import { Camera, Save, Loader2, Lock, Edit3 } from 'lucide-react'
import { ASSETS } from '@/lib/constants'
import { UserInfo } from '../../types'

interface GlobalUserInfo {
  id: string | number
  avatar?: string
  nickname?: string
  type?: string
}

interface BasicInfoTabProps {
  userForm: UserInfo
  globalUserInfo: GlobalUserInfo | null
  loading: boolean
  onUserInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSave: () => void
  onChangePassword: () => void
  onOpenAvatarDialog: () => void
}

export function BasicInfoTab({
  userForm,
  globalUserInfo,
  loading,
  onUserInfoChange,
  onSave,
  onChangePassword,
  onOpenAvatarDialog
}: BasicInfoTabProps) {
  return (
    <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-b-xl shadow-sm min-h-[100vh] border border-[rgb(var(--border))] border-t-0 overflow-hidden">
      <div className="py-3 px-6 border-b border-[rgb(var(--border))]">
        <h2 className="text-lg font-semibold text-[rgb(var(--primary))] flex items-center">
          <Edit3 className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
          基本信息管理
        </h2>
      </div>

      <div className="p-2 lg:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* 头像区域 */}
          <div className="lg:col-span-3 relative self-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[rgb(var(--border))] mx-auto lg:ml-20">
              <Image
                src={globalUserInfo?.avatar || ASSETS.DEFAULT_AVATAR}
                alt={`${globalUserInfo?.nickname || '用户'}的头像`}
                height={128}
                width={128}
                priority
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-black/30 rounded-full border-2 border-[rgb(var(--border))] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={onOpenAvatarDialog}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* 表单区域 */}
          <div className="lg:col-span-9 flex flex-col gap-2">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={onChangePassword}
                className="text-sm text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] flex items-center gap-1 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>修改密码</span>
              </button>
            </div>

            <form className="space-y-5">
              {/* 用户类型 */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-[rgb(var(--text))] min-w-[80px]">用户类型</label>
                <div className="flex-1 max-w-sm">
                  <div className="text-[rgb(var(--text))] p-2 bg-[rgb(var(--card))] rounded-lg border border-[rgb(var(--border))]">
                    {globalUserInfo?.type === '1' ? '管理员' : '普通用户'}
                  </div>
                </div>
              </div>

              {/* 昵称 */}
              <div className="flex items-center gap-4">
                <label htmlFor="nickname" className="text-sm text-[rgb(var(--text))] min-w-[80px]">
                  昵称
                </label>
                <div className="flex-1 max-w-sm">
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    value={userForm.nickname}
                    onChange={onUserInfoChange}
                    className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                    required
                  />
                </div>
              </div>

              {/* 用户名 */}
              <div className="flex items-center gap-4">
                <label htmlFor="username" className="text-sm text-[rgb(var(--text))] min-w-[80px]">
                  用户名
                </label>
                <div className="flex-1 max-w-sm">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={userForm.username}
                    onChange={onUserInfoChange}
                    className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                    required
                  />
                </div>
              </div>

              {/* 邮箱 */}
              <div className="flex items-center gap-4">
                <label htmlFor="email" className="text-sm text-[rgb(var(--text))] min-w-[80px]">
                  邮箱
                </label>
                <div className="flex-1 max-w-sm">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={onUserInfoChange}
                    className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                    required
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
                    loading
                      ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                      : 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>保存修改</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
