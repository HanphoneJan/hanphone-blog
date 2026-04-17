'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Link2, User, Image, Rss, Palette, FileText, Send, Loader2, Check, Wand2, ChevronDown
} from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { LINK_TYPES } from '../../types'
import type { FriendLink } from '../../types'

interface AddLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  url: string
  link_url: string
  description: string
  nickname: string
  avatar: string
  siteshot: string
  rss: string
  color: string
  type: string
  recommend: boolean
  published: boolean
  applyText: string
}

const initialFormData: FormData = {
  name: '',
  url: '',
  link_url: '',
  description: '',
  nickname: '',
  avatar: '',
  siteshot: '',
  rss: '',
  color: '#1890ff',
  type: 'friend',
  recommend: false,
  published: false,
  applyText: ''
}

export function AddLinkModal({ isOpen, onClose, onSuccess }: AddLinkModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 打开时重置
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData)
      setActiveTab('form')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 解析文本并填充表单
  const handleParseApplyText = async () => {
    if (!formData.applyText.trim()) {
      setError('请先粘贴友链信息')
      return
    }

    setParsing(true)
    setError('')

    try {
      const response = await apiClient({
        url: ENDPOINTS.ADMIN.FRIENDLINK_PARSE,
        method: 'POST',
        data: { applyText: formData.applyText }
      })

      const res = response.data

      if (res.code === 200 && res.data) {
        const parsed = res.data
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          url: parsed.url || prev.url,
          link_url: parsed.link_url || prev.link_url,
          description: parsed.description || prev.description,
          avatar: parsed.avatar || prev.avatar,
          siteshot: parsed.siteshot || prev.siteshot,
          rss: parsed.rss || prev.rss,
          nickname: parsed.nickname || prev.nickname,
          color: parsed.color || prev.color
        }))
        showAlert('解析成功，已填充到表单')
        // 切换到表单标签页查看结果
        setActiveTab('form')
      } else {
        setError(res.message || '解析失败')
      }
    } catch (err) {
      setError('解析请求失败')
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      setError('网站名称和网站地址为必填项')
      return
    }

    setLoading(true)
    setError('')

    try {
      const friendLinkData: FriendLink = {
        id: null,
        type: formData.type,
        name: formData.name,
        description: formData.description,
        url: formData.url,
        link_url: formData.link_url,
        avatar: formData.avatar,
        color: formData.color,
        recommend: formData.recommend,
        published: formData.published,
        nickname: formData.nickname,
        siteshot: formData.siteshot,
        rss: formData.rss,
        applyText: activeTab === 'text' ? formData.applyText : undefined,
        createTime: new Date().toISOString()
      }

      const response = await apiClient({
        url: ENDPOINTS.ADMIN.FRIENDLINK,
        method: 'POST',
        data: { friendLink: friendLinkData }
      })

      const res = response.data

      if (res.code === 200) {
        setSuccess(true)
        showAlert('友链添加成功')
        setTimeout(() => {
          setSuccess(false)
          setFormData(initialFormData)
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(res.message || '添加失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <ModalOverlay onClick={onClose} zIndex={9999} />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-[rgb(var(--card))] px-6 py-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[rgb(var(--text))]">
              新增友链
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--hover))] transition-colors"
            >
              <X className="w-4 h-4 text-[rgb(var(--text))]" />
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'form'
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              表单填写
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-[rgb(var(--primary))] text-white'
                  : 'bg-[rgb(var(--bg))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
              }`}
            >
              文本粘贴
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {activeTab === 'form' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 网站名称 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  网站名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="网站名称"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 网站地址 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  网站地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 回访地址 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  回访地址
                  <span className="text-xs text-[rgb(var(--muted))]">(对方站中本站的链接)</span>
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={e => handleChange('link_url', e.target.value)}
                  placeholder="https://example.com/links"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 友链类型 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  友链类型
                </label>
                <select
                  value={formData.type}
                  onChange={e => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                >
                  {LINK_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* 网站描述 */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  网站描述
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="简短描述"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 站长昵称 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  站长昵称
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={e => handleChange('nickname', e.target.value)}
                  placeholder="站长昵称"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 主题颜色 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  主题颜色
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    className="w-10 h-9 rounded border border-[rgb(var(--border))] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    placeholder="#1890ff"
                    className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                  />
                </div>
              </div>

              {/* 头像 URL */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  头像地址
                </label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={e => handleChange('avatar', e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 站点截图 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  站点截图
                </label>
                <input
                  type="text"
                  value={formData.siteshot}
                  onChange={e => handleChange('siteshot', e.target.value)}
                  placeholder="https://example.com/screenshot.png"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* RSS */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-[rgb(var(--text))]">
                  RSS 地址
                </label>
                <input
                  type="text"
                  value={formData.rss}
                  onChange={e => handleChange('rss', e.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
              </div>

              {/* 开关选项 */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-[rgb(var(--text))] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.recommend}
                    onChange={e => handleChange('recommend', e.target.checked)}
                    className="rounded border-[rgb(var(--border))] accent-[rgb(var(--primary))]"
                  />
                  推荐
                </label>
                <label className="flex items-center gap-2 text-sm text-[rgb(var(--text))] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={e => handleChange('published', e.target.checked)}
                    className="rounded border-[rgb(var(--border))] accent-[rgb(var(--primary))]"
                  />
                  直接发布
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[rgb(var(--muted))]/30 rounded-lg p-4 border border-[rgb(var(--border))]">
                <p className="text-sm text-[rgb(var(--text))] mb-2">粘贴友链信息，支持自动解析以下字段：</p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  名称、链接、回访链接、描述、头像、截图、RSS、昵称、颜色
                </p>
              </div>

              <textarea
                value={formData.applyText}
                onChange={e => handleChange('applyText', e.target.value)}
                placeholder={`示例：\n名称: 博客名\n链接: https://example.com\n头像: https://example.com/avatar.png\n描述: 一段描述\n回访链接: https://example.com/links`}
                rows={12}
                className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] font-mono resize-none"
              />

              <button
                onClick={handleParseApplyText}
                disabled={parsing || !formData.applyText.trim()}
                className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    解析并填充到表单
                  </>
                )}
              </button>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mt-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              添加成功
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="sticky bottom-0 bg-[rgb(var(--card))] px-6 py-4 border-t border-[rgb(var(--border))] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[rgb(var(--border))] text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!formData.name.trim() || !formData.url.trim())}
            className="flex-1 py-2.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                添加友链
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
