'use client'

import Image from 'next/image'
import { Upload as UploadIcon, X } from 'lucide-react'

interface AvatarUploadProps {
  mode: 'upload' | 'url'
  dialogImageUrl: string
  avatarUrl: string
  uploadRef: React.RefObject<HTMLInputElement | null>
  onModeChange: (mode: 'upload' | 'url') => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  onUploadClick: () => void
}

export function AvatarUpload({
  mode,
  dialogImageUrl,
  avatarUrl,
  uploadRef,
  onModeChange,
  onFileChange,
  onUrlChange,
  onRemove,
  onUploadClick
}: AvatarUploadProps) {
  return (
    <div className="space-y-2">
      {/* 模式切换按钮 */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => onModeChange('upload')}
          className={`px-3 py-1 rounded text-sm ${
            mode === 'upload'
              ? 'bg-[rgb(var(--primary))] text-white'
              : 'bg-[rgb(var(--hover))] text-[rgb(var(--text))]'
          }`}
        >
          上传图片
        </button>
        <button
          type="button"
          onClick={() => onModeChange('url')}
          className={`px-3 py-1 rounded text-sm ${
            mode === 'url'
              ? 'bg-[rgb(var(--primary))] text-white'
              : 'bg-[rgb(var(--hover))] text-[rgb(var(--text))]'
          }`}
        >
          图片URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="flex items-center gap-4 flex-wrap">
          {/* 上传区域 */}
          <div
            className="w-40 h-40 rounded-lg border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center cursor-pointer hover:border-[rgb(var(--primary))] transition-colors"
            onClick={onUploadClick}
          >
            {dialogImageUrl ? (
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                <Image
                  src={dialogImageUrl}
                  alt="友链头像预览"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="text-center">
                <UploadIcon className="h-8 w-8 mx-auto text-[rgb(var(--muted))]" />
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">上传</p>
              </div>
            )}
          </div>

          {/* 移除按钮 */}
          {dialogImageUrl && (
            <div className="flex gap-2">
              <button
                onClick={onRemove}
                className="px-3 py-1.5 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                移除
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={avatarUrl}
            onChange={onUrlChange}
            className="w-full px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
            placeholder="请输入图片URL"
          />
          {avatarUrl && (
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border-[rgb(var(--border))]">
              <Image
                src={avatarUrl}
                alt="友链头像预览"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}
        </div>
      )}

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
      <p className="text-xs text-[rgb(var(--muted))] mt-1">
        图片将自动压缩为JPEG格式，最大尺寸1200x1200px，保持原始文件名
      </p>
    </div>
  )
}
