'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Link2, Loader2, Upload, X } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import { IMAGE_URL_ERROR, isHttpUrl, normalizeImageUrl } from '@/lib/imageUrl'

export interface ImageFieldProps {
  /** 当前图片地址（受控） */
  value: string
  onChange: (url: string) => void
  label?: string
  /** 上传目录，例如 blog/blogs；留空由文件服务自动归档 */
  namespace?: string
  /** 预览宽高比，默认 16/9 */
  aspectRatio?: number
  /** 圆形预览（头像） */
  round?: boolean
  /** 圆形预览直径 / 方形预览最大宽度，单位 px */
  previewSize?: number
  accept?: string
  disabled?: boolean
  /** 上传按钮文案 */
  uploadText?: string
  /** URL 输入框占位 */
  placeholder?: string
  /** 输入框下方的说明文字 */
  hint?: string
  className?: string
  /**
   * 自定义上传实现（如未登录场景的公开上传）。
   * 传入后不再使用默认的登录态上传接口，进度以不确定态展示。
   */
  uploader?: (file: File) => Promise<string>
}

/**
 * 统一的图片输入控件：上传本地图片 + 手填图片 URL，二者任一即可。
 *
 * 后台所有图片字段都应使用本组件，不要再出现“只能上传”或“只能填 URL”的单向表单。
 */
export function ImageField({
  value,
  onChange,
  label,
  namespace,
  aspectRatio = 16 / 9,
  round = false,
  previewSize = 220,
  accept = 'image/*',
  disabled = false,
  uploadText = '上传图片',
  placeholder = '或粘贴图片地址，如 https://example.com/a.jpg',
  hint,
  className = '',
  uploader,
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    uploading,
    uploadProgress,
    error: uploadError,
    uploadImage,
    resetError,
  } = useImageUpload({ namespace })

  const [localUploading, setLocalUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState(value)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)

  const busy = uploader ? localUploading : uploading
  const progress = uploader ? 0 : uploadProgress
  const shownUploadError = uploader ? localError : uploadError?.message ?? null

  // 上传完成或外部重置时同步输入框
  useEffect(() => {
    setUrlDraft(value)
    setBroken(false)
    setUrlError(null)
  }, [value])

  const handlePick = () => {
    if (disabled || busy) return
    resetError()
    setLocalError(null)
    inputRef.current?.click()
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setUrlError('请选择图片文件')
        e.target.value = ''
        return
      }
      resetError()
      setLocalError(null)
      setUrlError(null)
      if (uploader) {
        setLocalUploading(true)
        try {
          const url = await uploader(file)
          onChange(url)
          setUrlDraft(url)
        } catch (err) {
          setLocalError(err instanceof Error ? err.message : '上传失败')
        } finally {
          setLocalUploading(false)
        }
      } else {
        await uploadImage(file, (url) => {
          onChange(url)
          setUrlDraft(url)
        })
      }
      if (inputRef.current) inputRef.current.value = ''
    },
    [onChange, resetError, uploadImage, uploader]
  )

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setUrlDraft(next)
    setUrlError(null)
    setBroken(false)
    if (!next.trim()) {
      onChange('')
      return
    }
    // 只在地址合法时向上提交，避免把半截输入写进表单
    if (isHttpUrl(next)) onChange(normalizeImageUrl(next))
  }

  const handleUrlBlur = () => {
    const raw = urlDraft.trim()
    if (raw && !isHttpUrl(raw)) {
      setUrlError(IMAGE_URL_ERROR)
    }
  }

  const handleClear = () => {
    onChange('')
    setUrlDraft('')
    setUrlError(null)
    setBroken(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const showImage = Boolean(value) && !broken
  const previewStyle = round
    ? { width: previewSize, height: previewSize }
    : { width: '100%', maxWidth: previewSize, aspectRatio: String(aspectRatio) }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">
          {label}
        </label>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div
          className={`relative shrink-0 overflow-hidden border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]/40 transition-colors ${
            round ? 'rounded-full' : 'rounded-lg'
          } ${disabled ? 'opacity-70' : 'cursor-pointer hover:border-[rgb(var(--primary))]'}`}
          style={previewStyle}
          onClick={handlePick}
        >
          {showImage ? (
            <Image
              src={value}
              alt={label || '图片预览'}
              fill
              unoptimized
              sizes="(max-width: 768px) 50vw, 240px"
              className="object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center">
              <ImageIcon className="h-7 w-7 text-[rgb(var(--text-muted))]" />
              <span className="text-xs text-[rgb(var(--text-muted))]">
                {broken ? '图片无法加载，可重新上传或换地址' : '点击上传'}
              </span>
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgb(var(--overlay))]/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{uploader ? '上传中…' : `${progress}%`}</span>
            </div>
          )}

          {showImage && !busy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white transition-colors hover:bg-red-600"
              aria-label="清除图片"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="min-w-[180px] flex-1 space-y-2">
          <button
            type="button"
            onClick={handlePick}
            disabled={disabled || busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--muted))]/60 px-3 py-2 text-sm text-[rgb(var(--text))] transition-all hover:bg-[rgb(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploader ? '上传中…' : `上传中… ${progress}%`}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {uploadText}
              </>
            )}
          </button>

          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
            <input
              type="text"
              value={urlDraft}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleUrlBlur()
                }
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={`w-full rounded-lg border bg-[rgb(var(--card))]/60 py-2 pl-9 pr-3 text-sm text-[rgb(var(--text))] transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] ${
                urlError ? 'border-red-500' : 'border-[rgb(var(--border))]'
              }`}
            />
          </div>

          {urlError ? (
            <p className="text-xs text-red-500">{urlError}</p>
          ) : shownUploadError ? (
            <p className="text-xs text-red-500">上传失败：{shownUploadError}</p>
          ) : hint ? (
            <p className="text-xs text-[rgb(var(--text-muted))]">{hint}</p>
          ) : (
            <p className="text-xs text-[rgb(var(--text-muted))]">
              上传本地图片，或直接填入图片地址，二者选其一即可。
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
