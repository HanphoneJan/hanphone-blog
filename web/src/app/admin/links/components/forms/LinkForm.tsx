'use client'

import { Loader2 } from 'lucide-react'
import { AvatarUpload } from '../AvatarUpload'
import { ColorPicker } from '../ColorPicker'
import { LINK_TYPES } from '../../types'
import type { FormValues } from '../../types'

interface LinkFormProps {
  formValues: FormValues
  dialogImageUrl: string
  avatarUrl: string
  avatarInputMode: 'upload' | 'url'
  loading: boolean
  uploadRef: React.RefObject<HTMLInputElement | null>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onAvatarModeChange: (mode: 'upload' | 'url') => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAvatarUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onUploadClick: () => void
  onColorChange: (value: string) => void
  onSubmit: () => void
}

export function LinkForm({
  formValues,
  dialogImageUrl,
  avatarUrl,
  avatarInputMode,
  loading,
  uploadRef,
  onInputChange,
  onAvatarModeChange,
  onFileChange,
  onAvatarUrlChange,
  onRemoveImage,
  onUploadClick,
  onColorChange,
  onSubmit
}: LinkFormProps) {
  return (
    <div className="p-6 space-y-6">
      {/* 友链名称 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">
          友链名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formValues.name}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入友链名称"
        />
      </div>

      {/* 友链类型 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">
          友链类型 <span className="text-red-500">*</span>
        </label>
        <select
          name="type"
          value={formValues.type}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
        >
          <option value="">请选择类型</option>
          {LINK_TYPES.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* 友链描述 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">友链描述</label>
        <textarea
          name="description"
          value={formValues.description}
          onChange={onInputChange}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入友链描述"
        ></textarea>
      </div>

      {/* 友链头像 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">友链头像</label>
        <AvatarUpload
          mode={avatarInputMode}
          dialogImageUrl={dialogImageUrl}
          avatarUrl={avatarUrl}
          uploadRef={uploadRef}
          onModeChange={onAvatarModeChange}
          onFileChange={onFileChange}
          onUrlChange={onAvatarUrlChange}
          onRemove={onRemoveImage}
          onUploadClick={onUploadClick}
        />
      </div>

      {/* 友链链接 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">
          友链链接 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="url"
          value={formValues.url}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入友链链接"
        />
      </div>

      {/* 友链颜色 */}
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">友链颜色</label>
        <ColorPicker
          value={formValues.color}
          onChange={(value) => {
            // 创建一个合成事件对象来兼容 onInputChange 的签名
            const syntheticEvent = {
              target: { name: 'color', value }
            } as React.ChangeEvent<HTMLInputElement>
            onInputChange(syntheticEvent)
          }}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white transition-colors flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          发布友链
        </button>
      </div>
    </div>
  )
}
