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
  updatePublishedLoading: number | null
  parsingLoading: number | null
  imageUploadRef: React.RefObject<HTMLInputElement | null>
  stats: { total: number; published: number; pending: number }
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
  onAddLink: () => void
}

export function ListTab({
  friendLinkList,
  filteredList,
  loading,
  filters,
  localInputValues,
  updateRecommendLoading,
  updatePublishedLoading,
  parsingLoading,
  imageUploadRef,
  stats,
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
  onDelete,
  onAddLink
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
        totalCount={stats.total}
        publishedCount={stats.published}
        pendingCount={stats.pending}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
        onAddLink={onAddLink}
      />

      {/* 友链列表 */}
      <LinkTable
        filteredList={filteredList}
        loading={loading}
        localInputValues={localInputValues}
        updateRecommendLoading={updateRecommendLoading}
        updatePublishedLoading={updatePublishedLoading}
        parsingLoading={parsingLoading}
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
        onEditSiteshot={onEditSiteshot}
        onSaveSiteshot={onSaveSiteshot}
        onCancelEditSiteshot={onCancelEditSiteshot}
        onEditRss={onEditRss}
        onSaveRss={onSaveRss}
        onCancelEditRss={onCancelEditRss}
        onEditNickname={onEditNickname}
        onSaveNickname={onSaveNickname}
        onCancelEditNickname={onCancelEditNickname}
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
        onTogglePublished={onTogglePublished}
        onParseApplyText={onParseApplyText}
        onDelete={onDelete}
      />
    </div>
  )
}
