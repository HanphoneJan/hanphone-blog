'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ListTab } from './components/tabs/ListTab'
import { AddLinkModal } from './components/forms/AddLinkModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useLinks } from './hooks/useLinks'
import { useLinkFilters } from './hooks/useLinkFilters'
import { useInlineEdit } from './hooks/useInlineEdit'
import { useAvatarUpload } from './hooks/useAvatarUpload'
import { alertSuccess } from '@/lib/Alert'
import type { FriendLink, ParsedApplyText } from './types'

// 动画变体定义
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

export default function FriendLinkManagement() {
  const [loading, setLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [applyConfirm, setApplyConfirm] = useState<{ link: FriendLink; parsed: ParsedApplyText } | null>(null)

  const {
    friendLinkList,
    deleteConfirm,
    updateRecommendLoading,
    updatePublishedLoading,
    parsingLoading,
    setDeleteConfirm,
    getFriendLinkList,
    updateFriendLink,
    deleteFriendLink,
    handleTypeChange,
    toggleRecommend,
    togglePublished,
    parseApplyText,
    applyParsedData,
    updateLocalList
  } = useLinks()

  const { filters, filteredList, stats, handleFilterChange, resetFilters } = useLinkFilters(friendLinkList)

  const {
    localInputValues,
    handleLocalInputChange,
    handleEditName,
    handleSaveName,
    handleCancelEditName,
    handleEditDescription,
    handleSaveDescription,
    handleCancelEditDescription,
    handleEditAvatar,
    handleSaveAvatar,
    handleCancelEditAvatar,
    handleEditSiteshot,
    handleSaveSiteshot,
    handleCancelEditSiteshot,
    handleEditRss,
    handleSaveRss,
    handleCancelEditRss,
    handleEditNickname,
    handleSaveNickname,
    handleCancelEditNickname,
    handleEditUrl,
    handleSaveUrl,
    handleCancelEditUrl,
    handleEditColor,
    handleSaveColor,
    handleCancelEditColor
  } = useInlineEdit({
    friendLinkList,
    updateLocalList,
    updateFriendLink
  })

  const { imageUploadRef, handleImageFileChange } = useAvatarUpload()

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirm) {
      await deleteFriendLink(deleteConfirm)
    }
  }, [deleteConfirm, deleteFriendLink])

  // 处理解析申请文本
  const handleParseApplyText = useCallback(async (link: FriendLink) => {
    const parsed = await parseApplyText(link)
    if (parsed) {
      setApplyConfirm({ link, parsed })
    }
  }, [parseApplyText])

  // 确认应用解析结果
  const handleApplyConfirm = useCallback(async () => {
    if (applyConfirm) {
      await applyParsedData(applyConfirm.link, applyConfirm.parsed)
      alertSuccess('解析结果已应用')
      setApplyConfirm(null)
    }
  }, [applyConfirm, applyParsedData])

  // 新增成功后刷新列表
  const handleAddSuccess = useCallback(() => {
    getFriendLinkList()
  }, [getFriendLinkList])

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(50,100,200,0.1)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(80,120,250,0.1)_0%,transparent_40%)]"></div>

      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 主内容区卡片 */}
        <motion.div
          variants={fadeInUpVariants}
          className="bg-[rgb(var(--card))]/80 backdrop-blur-sm lg:rounded-xl shadow-sm min-h-screen border-[rgb(var(--border))] overflow-hidden"
        >
          {/* 页面标题栏 */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[rgb(var(--border))]">
            <h1 className="text-lg font-semibold">友链管理</h1>
            {stats.pending > 0 && (
              <span className="px-2.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                {stats.pending} 待审核
              </span>
            )}
          </div>

          {/* 友链列表 */}
          <ListTab
            friendLinkList={friendLinkList}
            filteredList={filteredList}
            loading={loading}
            filters={filters}
            localInputValues={localInputValues}
            updateRecommendLoading={updateRecommendLoading}
            updatePublishedLoading={updatePublishedLoading}
            parsingLoading={parsingLoading}
            imageUploadRef={imageUploadRef}
            stats={stats}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
            onRefresh={getFriendLinkList}
            onEditName={handleEditName}
            onSaveName={handleSaveName}
            onCancelEditName={handleCancelEditName}
            onEditDescription={handleEditDescription}
            onSaveDescription={handleSaveDescription}
            onCancelEditDescription={handleCancelEditDescription}
            onEditAvatar={handleEditAvatar}
            onSaveAvatar={handleSaveAvatar}
            onCancelEditAvatar={handleCancelEditAvatar}
            onEditSiteshot={handleEditSiteshot}
            onSaveSiteshot={handleSaveSiteshot}
            onCancelEditSiteshot={handleCancelEditSiteshot}
            onEditRss={handleEditRss}
            onSaveRss={handleSaveRss}
            onCancelEditRss={handleCancelEditRss}
            onEditNickname={handleEditNickname}
            onSaveNickname={handleSaveNickname}
            onCancelEditNickname={handleCancelEditNickname}
            onEditUrl={handleEditUrl}
            onSaveUrl={handleSaveUrl}
            onCancelEditUrl={handleCancelEditUrl}
            onEditColor={handleEditColor}
            onSaveColor={handleSaveColor}
            onCancelEditColor={handleCancelEditColor}
            onTypeChange={handleTypeChange}
            onLocalInputChange={handleLocalInputChange}
            onImageFileChange={handleImageFileChange}
            onToggleRecommend={toggleRecommend}
            onTogglePublished={togglePublished}
            onParseApplyText={handleParseApplyText}
            onDelete={setDeleteConfirm}
            onAddLink={() => setAddModalOpen(true)}
          />
        </motion.div>
      </main>

      {/* 新增友链模态框 */}
      <AddLinkModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="确认删除"
        message="确定要删除这个友链吗？此操作不可撤销。"
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* 应用解析结果确认 */}
      <ConfirmDialog
        isOpen={!!applyConfirm}
        title="应用解析结果"
        message="解析成功！是否将解析结果应用到该友链？"
        confirmText="应用"
        cancelText="取消"
        variant="info"
        onConfirm={handleApplyConfirm}
        onCancel={() => setApplyConfirm(null)}
      />
    </motion.div>
  )
}
