'use client'

import Image from 'next/image'
import { Star, Trash2, ExternalLink, Loader2, Check, X, Eye, EyeOff, FileText, Wand2, Rss } from 'lucide-react'
import { ASSETS } from '@/lib/constants'
import { LINK_TYPES } from '../types'
import type { FriendLink, LocalInputValues } from '../types'

interface LinkTableProps {
  filteredList: FriendLink[]
  loading: boolean
  localInputValues: LocalInputValues
  updateRecommendLoading: number | null
  updatePublishedLoading: number | null
  parsingLoading: number | null
  imageUploadRef: React.RefObject<HTMLInputElement | null>
  onEditName: (id: number | null) => void
  onSaveName: (id: number | null) => void
  onCancelEditName: (id: number | null) => void
  onEditDescription: (id: number | null) => void
  onSaveDescription: (id: number | null) => void
  onCancelEditDescription: (id: number | null) => void
  onEditAvatar: (id: number | null) => void
  onSaveAvatar: (id: number | null) => void
  onCancelEditAvatar: (id: number | null) => void
  onEditSiteshot: (id: number | null) => void
  onSaveSiteshot: (id: number | null) => void
  onCancelEditSiteshot: (id: number | null) => void
  onEditRss: (id: number | null) => void
  onSaveRss: (id: number | null) => void
  onCancelEditRss: (id: number | null) => void
  onEditNickname: (id: number | null) => void
  onSaveNickname: (id: number | null) => void
  onCancelEditNickname: (id: number | null) => void
  onEditUrl: (id: number | null) => void
  onSaveUrl: (id: number | null) => void
  onCancelEditUrl: (id: number | null) => void
  onEditColor: (id: number | null) => void
  onSaveColor: (id: number | null) => void
  onCancelEditColor: (id: number | null) => void
  onTypeChange: (id: number | null, type: string) => void
  onLocalInputChange: (id: number, field: string, value: string) => void
  onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>, id: number | null) => void
  onToggleRecommend: (link: FriendLink) => void
  onTogglePublished: (link: FriendLink) => void
  onParseApplyText: (link: FriendLink) => void
  onDelete: (id: number | null) => void
}

export function LinkTable({
  filteredList,
  loading,
  localInputValues,
  updateRecommendLoading,
  updatePublishedLoading,
  parsingLoading,
  imageUploadRef,
  onEditName,
  onSaveName,
  onCancelEditName,
  onEditDescription,
  onSaveDescription,
  onCancelEditDescription,
  onEditAvatar,
  onSaveAvatar,
  onCancelEditAvatar,
  onEditSiteshot,
  onSaveSiteshot,
  onCancelEditSiteshot,
  onEditRss,
  onSaveRss,
  onCancelEditRss,
  onEditNickname,
  onSaveNickname,
  onCancelEditNickname,
  onEditUrl,
  onSaveUrl,
  onCancelEditUrl,
  onEditColor,
  onSaveColor,
  onCancelEditColor,
  onTypeChange,
  onLocalInputChange,
  onImageFileChange,
  onToggleRecommend,
  onTogglePublished,
  onParseApplyText,
  onDelete
}: LinkTableProps) {
  // 获取本地输入值
  const getLocalValue = (id: number, field: string) => {
    return localInputValues[id]?.[field as keyof typeof localInputValues[number]] || ''
  }

  // 渲染可编辑字段
  const renderEditableField = (
    link: FriendLink,
    field: string,
    editing: boolean,
    onEdit: () => void,
    onSave: () => void,
    onCancel: () => void,
    value: string,
    placeholder: string,
    isTextarea = false
  ) => {
    if (editing) {
      return (
        <div className="flex items-center gap-1">
          {isTextarea ? (
            <textarea
              value={getLocalValue(link.id!, field)}
              onChange={e => onLocalInputChange(link.id!, field, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded border-[rgb(var(--border))] bg-[rgb(var(--bg))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] resize-none"
            />
          ) : (
            <input
              type="text"
              value={getLocalValue(link.id!, field)}
              onChange={e => onLocalInputChange(link.id!, field, e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded border-[rgb(var(--border))] bg-[rgb(var(--bg))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            />
          )}
          <button
            onClick={onSave}
            className="p-1 text-green-500 hover:bg-green-50 rounded"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onCancel}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )
    }

    return (
      <div
        onClick={onEdit}
        className="cursor-pointer hover:bg-[rgb(var(--hover))] px-2 py-1 rounded transition-colors truncate"
        title={value || placeholder}
      >
        {value || <span className="text-[rgb(var(--muted))] italic">{placeholder}</span>}
      </div>
    )
  }

  // 渲染图片预览
  const renderImagePreview = (url: string, alt: string, size: 'sm' | 'md' = 'sm') => {
    const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-12 h-8'
    if (!url) {
      return (
        <div className={`${dimensions} bg-[rgb(var(--muted))] rounded flex items-center justify-center text-xs text-[rgb(var(--muted))]`}>
          无
        </div>
      )
    }
    return (
      <div className={`${dimensions} relative rounded overflow-hidden border border-[rgb(var(--border))]`}>
        <Image
          src={url}
          alt={alt}
          fill
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = ASSETS.DEFAULT_AVATAR
          }}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
      </div>
    )
  }

  if (filteredList.length === 0) {
    return (
      <div className="text-center py-12 text-[rgb(var(--muted))]">
        暂无友链数据
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filteredList.map((link) => (
        <div
          key={link.id}
          className={`p-3 rounded-lg border transition-all ${
            link.published
              ? 'bg-[rgb(var(--card))] border-[rgb(var(--border))]'
              : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          {/* 第一行：头像、名称、类型、状态、操作 */}
          <div className="flex items-center gap-3 mb-2">
            {/* 头像 */}
            <div className="flex-shrink-0">
              {renderImagePreview(link.avatar, link.name, 'sm')}
            </div>

            {/* 名称 */}
            <div className="flex-1 min-w-0">
              {renderEditableField(
                link,
                'name',
                link.editingName || false,
                () => onEditName(link.id),
                () => onSaveName(link.id),
                () => onCancelEditName(link.id),
                link.name,
                '网站名称'
              )}
            </div>

            {/* 类型选择 */}
            <select
              value={link.type}
              onChange={e => onTypeChange(link.id, e.target.value)}
              className="px-2 py-1 text-xs rounded border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
            >
              {LINK_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            {/* 状态标签 */}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              link.published
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {link.published ? '已发布' : '待审核'}
            </span>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1">
              {/* 审核开关 */}
              <button
                onClick={() => onTogglePublished(link)}
                disabled={updatePublishedLoading === link.id}
                className={`p-1.5 rounded transition-colors ${
                  link.published
                    ? 'text-green-500 hover:bg-green-50'
                    : 'text-yellow-500 hover:bg-yellow-50'
                }`}
                title={link.published ? '取消发布' : '审核发布'}
              >
                {updatePublishedLoading === link.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : link.published ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>

              {/* 推荐 */}
              <button
                onClick={() => onToggleRecommend(link)}
                disabled={updateRecommendLoading === link.id}
                className={`p-1.5 rounded transition-colors ${
                  link.recommend
                    ? 'text-yellow-500 hover:bg-yellow-50'
                    : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))]'
                }`}
                title={link.recommend ? '取消推荐' : '设为推荐'}
              >
                {updateRecommendLoading === link.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Star className={`w-4 h-4 ${link.recommend ? 'fill-current' : ''}`} />
                )}
              </button>

              {/* 解析按钮（有applyText时显示） */}
              {link.applyText && (
                <button
                  onClick={() => onParseApplyText(link)}
                  disabled={parsingLoading === link.id}
                  className="p-1.5 rounded text-purple-500 hover:bg-purple-50 transition-colors"
                  title="解析申请文本"
                >
                  {parsingLoading === link.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* 访问 */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))]"
                title="访问网站"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* 删除 */}
              <button
                onClick={() => onDelete(link.id)}
                className="p-1.5 rounded text-red-500 hover:bg-red-50"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 第二行：URL、描述 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 text-xs">
            <div>
              <span className="text-[rgb(var(--muted))]">URL: </span>
              {renderEditableField(
                link,
                'url',
                link.editingUrl || false,
                () => onEditUrl(link.id),
                () => onSaveUrl(link.id),
                () => onCancelEditUrl(link.id),
                link.url,
                '网站地址'
              )}
            </div>
            <div>
              <span className="text-[rgb(var(--muted))]">描述: </span>
              {renderEditableField(
                link,
                'description',
                link.editingDescription || false,
                () => onEditDescription(link.id),
                () => onSaveDescription(link.id),
                () => onCancelEditDescription(link.id),
                link.description,
                '网站描述'
              )}
            </div>
          </div>

          {/* 第三行：昵称、RSS、图片 */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 昵称 */}
            <div className="flex items-center gap-1">
              <span className="text-[rgb(var(--muted))]">昵称:</span>
              {renderEditableField(
                link,
                'nickname',
                link.editingNickname || false,
                () => onEditNickname(link.id),
                () => onSaveNickname(link.id),
                () => onCancelEditNickname(link.id),
                link.nickname || '',
                '-'
              )}
            </div>

            {/* RSS */}
            <div className="flex items-center gap-1">
              <Rss className="w-3 h-3 text-[rgb(var(--muted))]" />
              {link.rss ? (
                <a href={link.rss} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--primary))] hover:underline truncate max-w-[120px]">
                  RSS
                </a>
              ) : (
                <span className="text-[rgb(var(--muted))]">-</span>
              )}
            </div>

            {/* 站点截图 */}
            {link.siteshot && (
              <div className="flex items-center gap-1">
                <span className="text-[rgb(var(--muted))]">截图:</span>
                {renderImagePreview(link.siteshot, '站点截图', 'md')}
              </div>
            )}

            {/* 主题色 */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[rgb(var(--muted))]">颜色:</span>
              <div
                className="w-4 h-4 rounded border border-[rgb(var(--border))]"
                style={{ backgroundColor: link.color || '#1890ff' }}
                title={link.color}
              />
            </div>
          </div>

          {/* 展开的申请文本（如果有） */}
          {link.applyText && (
            <div className="mt-2 p-2 bg-[rgb(var(--muted))]/10 rounded text-xs">
              <div className="flex items-center gap-1 text-[rgb(var(--muted))] mb-1">
                <FileText className="w-3 h-3" />
                <span>申请原文:</span>
              </div>
              <pre className="whitespace-pre-wrap text-[rgb(var(--text))]/70 font-mono text-[10px]">
                {link.applyText.length > 200 ? link.applyText.slice(0, 200) + '...' : link.applyText}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
