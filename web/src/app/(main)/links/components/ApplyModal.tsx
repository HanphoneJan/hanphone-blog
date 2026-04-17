'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Link2, User, Image, Rss, Palette, FileText, Send, Loader2, Check } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import { SITE_URL } from '@/lib/seo-config'

interface ApplyModalProps {
  isOpen: boolean
  onClose: () => void
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
  applyText: ''
}

// 示例文本
const EXAMPLE_TEXT = `名称: "云林有风"
描述: "不骛于虚声"
链接: "${SITE_URL}"
头像: "${SITE_URL}/avatar.png"
装饰色: "#1890ff"`

export default function ApplyModal({ isOpen, onClose }: ApplyModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        url: formData.url,
        link_url: formData.link_url,
        description: formData.description,
        type: 'friend',
        color: formData.color,
        avatar: formData.avatar,
        siteshot: formData.siteshot,
        rss: formData.rss,
        nickname: formData.nickname,
        recommend: false,
        published: false
      }

      // 如果使用文本粘贴模式，添加 applyText
      if (activeTab === 'text' && formData.applyText) {
        payload.applyText = formData.applyText
      }

      const res = await fetch(ENDPOINTS.FRIENDLINKS_APPLY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.flag && data.code === 200) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setFormData(initialFormData)
          onClose()
        }, 2000)
      } else {
        setError(data.message || '提交失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const isValid = activeTab === 'form' 
    ? formData.name && formData.url && formData.description
    : formData.applyText

  if (!isOpen) return null

  const modal = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[rgb(var(--bg))] border-2 border-[rgb(var(--text))]"
        onClick={e => e.stopPropagation()}
      >
        {/* 阴影层 */}
        <div 
          className="absolute inset-0 bg-[rgb(var(--primary))] -z-10"
          style={{ transform: 'translate(6px, 6px)' }}
        />
        
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] font-bold hover:bg-[rgb(var(--primary))] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 标题 */}
        <div className="p-6 border-b-2 border-[rgb(var(--text))]">
          <div className="flex items-center gap-3">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-[rgb(var(--primary))]" />
            <h3 className="text-xl font-black" style={{ fontFamily: 'system-ui, sans-serif' }}>
              申请友链
            </h3>
          </div>
          
          {/* Tab 切换 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 px-4 border-2 font-bold transition-colors ${
                activeTab === 'form'
                  ? 'bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))]'
                  : 'bg-[rgb(var(--bg))] border-[rgb(var(--text))] hover:bg-[rgb(var(--muted))]'
              }`}
            >
              表单填写
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 px-4 border-2 font-bold transition-colors ${
                activeTab === 'text'
                  ? 'bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))]'
                  : 'bg-[rgb(var(--bg))] border-[rgb(var(--text))] hover:bg-[rgb(var(--muted))]'
              }`}
            >
              文本粘贴
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {activeTab === 'form' ? (
            <div className="space-y-4">
              {/* 网站名称 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Link2 className="w-4 h-4" />
                  网站名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="你的网站名称"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 网站地址 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Link2 className="w-4 h-4" />
                  网站地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 回访地址（本站在你站的链接） */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Link2 className="w-4 h-4" />
                  回访地址
                  <span className="text-xs opacity-50 font-normal">（本站在你站中的链接）</span>
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={e => handleChange('link_url', e.target.value)}
                  placeholder="https://example.com/links"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 网站描述 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <FileText className="w-4 h-4" />
                  网站描述 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="简短描述你的网站"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 站长昵称 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <User className="w-4 h-4" />
                  站长昵称
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={e => handleChange('nickname', e.target.value)}
                  placeholder="你的昵称"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 头像 URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Image className="w-4 h-4" />
                  头像地址
                </label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={e => handleChange('avatar', e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 站点截图 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Image className="w-4 h-4" />
                  站点截图
                </label>
                <input
                  type="text"
                  value={formData.siteshot}
                  onChange={e => handleChange('siteshot', e.target.value)}
                  placeholder="https://example.com/screenshot.png"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* RSS */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Rss className="w-4 h-4" />
                  RSS 地址
                </label>
                <input
                  type="text"
                  value={formData.rss}
                  onChange={e => handleChange('rss', e.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>

              {/* 主题颜色 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2">
                  <Palette className="w-4 h-4" />
                  主题颜色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    className="w-12 h-10 border-2 border-[rgb(var(--text))] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    placeholder="#1890ff"
                    className="flex-1 px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[rgb(var(--muted))] border-2 border-[rgb(var(--text))] p-4">
                <p className="text-sm font-bold mb-2">粘贴格式示例：</p>
                <pre className="text-xs text-[rgb(var(--text-muted))] whitespace-pre-wrap">
                  {EXAMPLE_TEXT}
                </pre>
              </div>
              
              <textarea
                value={formData.applyText}
                onChange={e => handleChange('applyText', e.target.value)}
                placeholder="在此粘贴你的友链信息..."
                rows={10}
                className="w-full px-3 py-2 border-2 border-[rgb(var(--text))] bg-[rgb(var(--bg))] focus:outline-none focus:border-[rgb(var(--primary))] font-mono text-sm resize-none"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 border-2 border-red-500 bg-red-50 text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mt-4 p-3 border-2 border-green-500 bg-green-50 text-green-700 text-sm font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              申请已提交，等待审核
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t-2 border-[rgb(var(--text))] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-[rgb(var(--text))] font-bold hover:bg-[rgb(var(--muted))] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 py-3 border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                提交申请
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
