'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Edit2, Save, X, Upload as UploadIcon, Star, Trash2, Loader2 } from 'lucide-react'
import { ASSETS } from '@/lib/constants'
import { LINK_TYPES } from '../types'
import type { FriendLink, LocalInputValues } from '../types'
import { formatDate } from '../utils/linkValidation'

interface LinkCardProps {
  friendLink: FriendLink
  localValues: LocalInputValues[number]
  updateRecommendLoading: number | null
  onEditName: (id: number | null) => void
  onSaveName: (id: number | null) => void
  onCancelEditName: (id: number | null) => void
  onEditDescription: (id: number | null) => void
  onSaveDescription: (id: number | null) => void
  onCancelEditDescription: (id: number | null) => void
  onEditAvatar: (id: number | null) => void
  onSaveAvatar: (id: number | null) => void
  onCancelEditAvatar: (id: number | null) => void
  onEditUrl: (id: number | null) => void
  onSaveUrl: (id: number | null) => void
  onCancelEditUrl: (id: number | null) => void
  onEditColor: (id: number | null) => void
  onSaveColor: (id: number | null) => void
  onCancelEditColor: (id: number | null) => void
  onTypeChange: (id: number | null, type: string) => void
  onLocalInputChange: (id: number, field: string, value: string) => void
  onUploadClick: () => void
  onToggleRecommend: (link: FriendLink) => void
  onDelete: (id: number | null) => void
}

export function LinkCard({
  friendLink,
  localValues,
  updateRecommendLoading,
  onEditName,
  onSaveName,
  onCancelEditName,
  onEditDescription,
  onSaveDescription,
  onCancelEditDescription,
  onEditAvatar,
  onSaveAvatar,
  onCancelEditAvatar,
  onEditUrl,
  onSaveUrl,
  onCancelEditUrl,
  onEditColor,
  onSaveColor,
  onCancelEditColor,
  onTypeChange,
  onLocalInputChange,
  onUploadClick,
  onToggleRecommend,
  onDelete
}: LinkCardProps) {
  const friendLinkId = friendLink.id

  return (
    <div className="bg-[rgb(var(--card))]/60 border-[rgb(var(--border))] lg:rounded-lg p-3 hover:bg-[rgb(var(--hover))]/80 transition-all duration-300">
      <div className="grid grid-cols-12 gap-3">
        {/* 头像区域 */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-xs sm:text-sm text-[rgb(var(--muted))] mb-1 self-start">
              友链头像
            </p>
            {friendLink.editingAvatar ? (
              <div className="w-full space-y-2">
                <div className="relative w-full h-24 md:h-28 rounded-lg overflow-hidden">
                  <Image
                    src={localValues?.avatar || friendLink.avatar}
                    alt={friendLink.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    value={localValues?.avatar || ''}
                    onChange={e =>
                      friendLinkId &&
                      onLocalInputChange(friendLinkId, 'avatar', e.target.value)
                    }
                    className="w-full px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    placeholder="头像URL"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={onUploadClick}
                      className="flex-1 px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <UploadIcon className="h-3 w-3" />
                      上传
                    </button>
                    <button
                      onClick={() => onSaveAvatar(friendLink.id)}
                      className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => onCancelEditAvatar(friendLink.id)}
                      className="px-2 py-1 rounded bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative group w-full">
                <div className="relative w-full h-24 md:h-28 rounded-lg overflow-hidden border-[rgb(var(--border))]">
                  <Image
                    src={friendLink.avatar || ASSETS.DEFAULT_AVATAR}
                    alt={friendLink.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <button
                  onClick={() => onEditAvatar(friendLink.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-[rgb(var(--card))]/80 text-[rgb(var(--text))] hover:bg-[rgb(var(--card))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                  title="编辑头像"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="col-span-12 md:col-span-9 lg:col-span-9">
          <div className="space-y-3">
            {/* 第一行：名称和类型 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 友链名称 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">友链名称</p>
                {friendLink.editingName ? (
                  <div className="flex gap-1">
                    <input
                      value={localValues?.name || ''}
                      onChange={e =>
                        friendLinkId &&
                        onLocalInputChange(friendLinkId, 'name', e.target.value)
                      }
                      className="flex-1 px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <button
                      onClick={() => onSaveName(friendLink.id)}
                      className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onCancelEditName(friendLink.id)}
                      className="px-2 py-1 rounded bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors text-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <h3 className="text-base sm:text-lg font-medium text-[rgb(var(--text))] truncate">
                      {friendLink.name}
                    </h3>
                    <button
                      onClick={() => onEditName(friendLink.id)}
                      className="p-1 rounded text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑名称"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 友链类型 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">友链类型</p>
                <select
                  value={friendLink.type}
                  onChange={e => onTypeChange(friendLink.id, e.target.value)}
                  className="w-full px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                >
                  {LINK_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 第二行：描述 */}
            <div className="grid grid-cols-1 gap-3">
              {/* 友链描述 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">友链描述</p>
                {friendLink.editingDescription ? (
                  <div className="space-y-1">
                    <textarea
                      value={localValues?.description || ''}
                      onChange={e =>
                        friendLinkId &&
                        onLocalInputChange(friendLinkId, 'description', e.target.value)
                      }
                      rows={2}
                      className="w-full px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSaveDescription(friendLink.id)}
                        className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => onCancelEditDescription(friendLink.id)}
                        className="px-2 py-1 rounded bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <p className="text-sm text-[rgb(var(--text))] line-clamp-2">
                      {friendLink.description}
                    </p>
                    <button
                      onClick={() => onEditDescription(friendLink.id)}
                      className="mt-1 p-1 rounded text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑描述"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 第三行：链接和颜色 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 友链链接 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">友链链接</p>
                {friendLink.editingUrl ? (
                  <div className="space-y-1">
                    <input
                      value={localValues?.url || ''}
                      onChange={e =>
                        friendLinkId &&
                        onLocalInputChange(friendLinkId, 'url', e.target.value)
                      }
                      className="w-full px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSaveUrl(friendLink.id)}
                        className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => onCancelEditUrl(friendLink.id)}
                        className="px-2 py-1 rounded bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <Link
                      href={friendLink.url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] truncate"
                    >
                      {friendLink.url}
                    </Link>
                    <button
                      onClick={() => onEditUrl(friendLink.id)}
                      className="p-1 rounded text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑链接"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 友链颜色 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">友链颜色</p>
                {friendLink.editingColor ? (
                  <div className="space-y-1">
                    <input
                      value={localValues?.color || ''}
                      onChange={e =>
                        friendLinkId &&
                        onLocalInputChange(friendLinkId, 'color', e.target.value)
                      }
                      className="w-full px-2 py-1 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSaveColor(friendLink.id)}
                        className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => onCancelEditColor(friendLink.id)}
                        className="px-2 py-1 rounded bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-5 h-5 rounded-full border-[rgb(var(--border))]"
                        style={{ backgroundColor: friendLink.color || '#1890ff' }}
                      ></div>
                      <span className="text-sm text-[rgb(var(--text))]">
                        {friendLink.color || '#1890ff'}
                      </span>
                    </div>
                    <button
                      onClick={() => onEditColor(friendLink.id)}
                      className="p-1 rounded text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑颜色"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 第四行：创建时间和操作按钮 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 创建时间 */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-[rgb(var(--muted))]">创建时间</p>
                <p className="text-sm text-[rgb(var(--text))]">
                  {formatDate(friendLink.createTime)}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-end justify-end gap-2">
                {/* 推荐按钮 */}
                <button
                  onClick={() => onToggleRecommend(friendLink)}
                  disabled={updateRecommendLoading === friendLink.id}
                  className={`px-3 py-1 rounded transition-colors text-sm flex items-center gap-1 ${
                    friendLink.recommend
                      ? 'bg-yellow-100/60 text-yellow-600 hover:bg-yellow-100/80'
                      : 'bg-[rgb(var(--hover))]/60 text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))]/80'
                  }`}
                  title={friendLink.recommend ? '取消推荐' : '推荐友链'}
                >
                  {updateRecommendLoading === friendLink.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Star
                      className={`h-3 w-3 ${
                        friendLink.recommend ? 'fill-current' : ''
                      }`}
                    />
                  )}
                  {friendLink.recommend ? '已推荐' : '推荐'}
                </button>

                <button
                  onClick={() => onDelete(friendLink.id)}
                  className="px-3 py-1 rounded bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors text-sm flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
