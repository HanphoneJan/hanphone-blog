'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Image, Link, Upload, Loader2, Sun, Layers } from 'lucide-react'
import ModalOverlay from './shared/ModalOverlay'
import Compressor from 'compressorjs'
import { STORAGE_KEYS, BACKGROUND_CONFIG } from '@/lib/constants'
import { BACKGROUND_LABELS } from '@/lib/labels'
import { alertSuccess } from '@/lib/Alert'

interface BackgroundSettingsProps {
  open: boolean
  onClose: () => void
}

export default function BackgroundSettings({ open, onClose }: BackgroundSettingsProps) {
  const [mode, setMode] = useState<'default' | 'url' | 'file'>('default')
  const [urlInput, setUrlInput] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [opacity, setOpacity] = useState(BACKGROUND_CONFIG.DEFAULT_OPACITY)
  const [overlay, setOverlay] = useState(BACKGROUND_CONFIG.DEFAULT_OVERLAY)
  const fileRef = useRef<HTMLInputElement>(null)

  // 加载保存的设置
  useEffect(() => {
    if (open) {
      const savedOpacity = localStorage.getItem(STORAGE_KEYS.BACKGROUND_OPACITY)
      if (savedOpacity) {
        const parsed = parseInt(savedOpacity, 10)
        if (!isNaN(parsed)) setOpacity(parsed)
      }

      const savedOverlay = localStorage.getItem(STORAGE_KEYS.BACKGROUND_OVERLAY)
      if (savedOverlay) {
        const parsed = parseInt(savedOverlay, 10)
        if (!isNaN(parsed)) setOverlay(parsed)
      }
    }
  }, [open])

  const applyDefault = () => {
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_CUSTOM, 'default')
    window.dispatchEvent(new CustomEvent(BACKGROUND_CONFIG.CHANGE_EVENT))
    alertSuccess(BACKGROUND_LABELS.SAVE_SUCCESS)
  }

  const applyUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    if (!/^https?:\/\//i.test(trimmed)) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_CUSTOM, `url:${trimmed}`)
    window.dispatchEvent(new CustomEvent(BACKGROUND_CONFIG.CHANGE_EVENT))
    alertSuccess(BACKGROUND_LABELS.SAVE_SUCCESS)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > BACKGROUND_CONFIG.MAX_INPUT_BYTES) {
      alert(BACKGROUND_LABELS.FILE_TOO_LARGE)
      e.target.value = ''
      return
    }
    setCompressing(true)
    const done = () => setCompressing(false)
    new Compressor(file, {
      quality: BACKGROUND_CONFIG.COMPRESS_QUALITY,
      maxWidth: BACKGROUND_CONFIG.COMPRESS_MAX_WIDTH,
      maxHeight: BACKGROUND_CONFIG.COMPRESS_MAX_HEIGHT,
      mimeType: 'image/jpeg',
      convertSize: 0,
      success: result => {
        const reader = new FileReader()
        reader.onload = () => {
          done()
          const data = reader.result as string
          if (data.length > BACKGROUND_CONFIG.MAX_STORED_BYTES) {
            alert(BACKGROUND_LABELS.FILE_TOO_LARGE)
            return
          }
          localStorage.setItem(STORAGE_KEYS.BACKGROUND_CUSTOM, data)
          window.dispatchEvent(new CustomEvent(BACKGROUND_CONFIG.CHANGE_EVENT))
          alertSuccess(BACKGROUND_LABELS.SAVE_SUCCESS)
        }
        reader.onerror = () => {
          done()
          alert(BACKGROUND_LABELS.COMPRESS_FAIL)
        }
        reader.readAsDataURL(result)
      },
      error: () => {
        done()
        alert(BACKGROUND_LABELS.COMPRESS_FAIL)
      }
    })
    e.target.value = ''
  }

  // 保存透明度设置
  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_OPACITY, value.toString())
    window.dispatchEvent(new CustomEvent(BACKGROUND_CONFIG.OPACITY_CHANGE_EVENT))
  }

  // 保存遮罩强度设置
  const handleOverlayChange = (value: number) => {
    setOverlay(value)
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_OVERLAY, value.toString())
    window.dispatchEvent(new CustomEvent(BACKGROUND_CONFIG.OVERLAY_CHANGE_EVENT))
  }

  if (!open) return null

  const modalContent = (
    <>
      <ModalOverlay onClick={onClose} zIndex={9998} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl shadow-xl p-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-settings-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="background-settings-title" className="text-lg font-semibold text-[rgb(var(--text))]">
            {BACKGROUND_LABELS.TITLE}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgb(var(--hover))] transition-colors"
            aria-label={BACKGROUND_LABELS.CLOSE}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 透明度控制 */}
          <div className="border border-[rgb(var(--border))] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="h-4 w-4 text-[rgb(var(--primary))]" />
              <span className="text-sm font-medium text-[rgb(var(--text))]">背景透明度</span>
              <span className="ml-auto text-xs text-[rgb(var(--text-muted))]">{opacity}%</span>
            </div>
            <input
              type="range"
              min={BACKGROUND_CONFIG.MIN_OPACITY}
              max={BACKGROUND_CONFIG.MAX_OPACITY}
              value={opacity}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-[rgb(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[rgb(var(--primary))]"
            />
            <div className="flex justify-between text-xs text-[rgb(var(--text-muted))] mt-1">
              <span>更透明</span>
              <span>更清晰</span>
            </div>
          </div>

          {/* 遮罩强度控制 */}
          <div className="border border-[rgb(var(--border))] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-[rgb(var(--primary))]" />
              <span className="text-sm font-medium text-[rgb(var(--text))]">遮罩强度</span>
              <span className="ml-auto text-xs text-[rgb(var(--text-muted))]">{overlay}%</span>
            </div>
            <input
              type="range"
              min={BACKGROUND_CONFIG.MIN_OVERLAY}
              max={BACKGROUND_CONFIG.MAX_OVERLAY}
              value={overlay}
              onChange={(e) => handleOverlayChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-[rgb(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[rgb(var(--primary))]"
            />
            <div className="flex justify-between text-xs text-[rgb(var(--text-muted))] mt-1">
              <span>无遮罩</span>
              <span>强遮罩</span>
            </div>
          </div>

          {/* 默认背景 */}
          <button
            onClick={() => {
              setMode('default')
              applyDefault()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] transition-colors text-left"
          >
            <Image className="h-5 w-5 text-[rgb(var(--primary))]" />
            <span>{BACKGROUND_LABELS.DEFAULT}</span>
          </button>

          {/* URL 自定义 */}
          <div className="border border-[rgb(var(--border))] rounded-lg p-3">
            <button
              onClick={() => setMode(mode === 'url' ? 'default' : 'url')}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-[rgb(var(--hover))] transition-colors text-left"
            >
              <Link className="h-5 w-5 text-[rgb(var(--primary))]" />
              <span>{BACKGROUND_LABELS.CUSTOM_URL}</span>
            </button>
            {mode === 'url' && (
              <div className="mt-3 space-y-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder={BACKGROUND_LABELS.URL_PLACEHOLDER}
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
                />
                <p className="text-xs text-[rgb(var(--text-muted))]">{BACKGROUND_LABELS.URL_HINT}</p>
                <button
                  onClick={applyUrl}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  应用
                </button>
              </div>
            )}
          </div>

          {/* 文件上传 */}
          <div className="border border-[rgb(var(--border))] rounded-lg p-3">
            <label
              className={`flex items-center gap-3 p-2 rounded hover:bg-[rgb(var(--hover))] transition-colors cursor-pointer ${compressing ? 'pointer-events-none opacity-70' : ''}`}
            >
              {compressing ? (
                <Loader2 className="h-5 w-5 text-[rgb(var(--primary))] animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-[rgb(var(--primary))]" />
              )}
              <span>{compressing ? BACKGROUND_LABELS.COMPRESSING : BACKGROUND_LABELS.CUSTOM_FILE}</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={compressing}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{BACKGROUND_LABELS.FILE_HINT}</p>
          </div>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
