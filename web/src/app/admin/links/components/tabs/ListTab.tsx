'use client'

import { useEffect } from 'react'
import { LinkFilters } from '../LinkFilters'
import { LinkTable } from '../LinkTable'
import type { FriendLink, LocalInputValues, FilterState } from '../../types'

interface ListTabProps {
  friendLinkList: FriendLink[]
  filteredList: FriendLink[]
  loading: boolean
  filters: FilterState
  localInputValues: LocalInputValues
  updateRecommendLoading: number | null
  imageUploadRef: React.RefObject<HTMLInputElement | null>
  onFilterChange: (name: keyof FilterState, value: string) => void
  onResetFilters: () => void
  onRefresh: () => void
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

export function ListTab({
  friendLinkList,
  filteredList,
  loading,
  filters,
  localInputValues,
  updateRecommendLoading,
  imageUploadRef,
  onFilterChange,
  onResetFilters,
  onRefresh,
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
}: ListTabProps) {
  // 组件挂载时刷新列表
  useEffect(() => {
    onRefresh()
  }, [onRefresh])

  return (
    <div className="px-0 md:px-6 md:py-3 overflow-x-auto">
      {/* 筛选区域 */}
      <LinkFilters
        filters={filters}
        totalCount={friendLinkList.length}
        filteredCount={filteredList.length}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
      />

      {/* 友链列表 */}
      <LinkTable
        filteredList={filteredList}
        loading={loading}
        localInputValues={localInputValues}
        updateRecommendLoading={updateRecommendLoading}
        imageUploadRef={imageUploadRef}
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
        onImageFileChange={onImageFileChange}
        onToggleRecommend={onToggleRecommend}
        onDelete={onDelete}
      />
    </div>
  )
}
