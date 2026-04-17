'use client'

import { AlertCircle } from 'lucide-react'
import { LinkCard } from './LinkCard'
import type { FriendLink, LocalInputValues } from '../types'

interface LinkTableProps {
  filteredList: FriendLink[]
  loading: boolean
  localInputValues: LocalInputValues
  updateRecommendLoading: number | null
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
  onDelete: (id: number | null) => void
}

export function LinkTable({
  filteredList,
  loading,
  localInputValues,
  updateRecommendLoading,
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
  onDelete
}: LinkTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 h-100 flex flex-col justify-center">
        {[1, 2, 3, 4, 5].map(item => (
          <div key={item} className="animate-pulse bg-[rgb(var(--muted))]/50 rounded-lg h-48"></div>
        ))}
      </div>
    )
  }

  if (filteredList.length === 0) {
    return (
      <div className="text-center py-12 min-h-[90vh]">
        <AlertCircle className="mx-auto h-12 w-12 text-[rgb(var(--muted))] mb-4" />
        <p className="text-[rgb(var(--muted))]">暂无友链数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        onChange={e => {
          // 获取当前正在编辑的友链ID
          const editingLink = filteredList.find(l => l.editingAvatar)
          if (editingLink) {
            onImageFileChange(e, editingLink.id)
          }
        }}
        className="hidden"
      />
      {filteredList.map(friendLink => (
        <LinkCard
          key={friendLink.id}
          friendLink={friendLink}
          localValues={localInputValues[friendLink.id || 0] || {}}
          updateRecommendLoading={updateRecommendLoading}
          onEditName={onEditName}
          onSaveName={onSaveName}
          onCancelEditName={onCancelEditName}
          onEditDescription={onEditDescription}
          onSaveDescription={onSaveDescription}
          onCancelEditDescription={onCancelEditDescription}
          onEditAvatar={onEditAvatar}
          onSaveAvatar={onSaveAvatar}
          onCancelEditAvatar={onCancelEditAvatar}
          onEditUrl={onEditUrl}
          onSaveUrl={onSaveUrl}
          onCancelEditUrl={onCancelEditUrl}
          onEditColor={onEditColor}
          onSaveColor={onSaveColor}
          onCancelEditColor={onCancelEditColor}
          onTypeChange={onTypeChange}
          onLocalInputChange={onLocalInputChange}
          onUploadClick={() => imageUploadRef.current?.click()}
          onToggleRecommend={onToggleRecommend}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
