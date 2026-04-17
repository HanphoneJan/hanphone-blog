'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { PublishTab } from './components/tabs/PublishTab'
import { ListTab } from './components/tabs/ListTab'
import { useLinks } from './hooks/useLinks'
import { useLinkFilters } from './hooks/useLinkFilters'
import { useInlineEdit } from './hooks/useInlineEdit'
import { useAvatarUpload } from './hooks/useAvatarUpload'
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

const tabVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3
    }
  }
}

export default function FriendLinkManagement() {
  const [activeTab, setActiveTab] = useState('list')
  const [loading, setLoading] = useState(false)

  const {
    friendLinkList,
    deleteConfirm,
    updateRecommendLoading,
    updatePublishedLoading,
    parsingLoading,
    setDeleteConfirm,
    getFriendLinkList,
    publishFriendLink,
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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    if (tab === 'list') {
      getFriendLinkList()
    }
  }, [getFriendLinkList])

  const handlePublishSuccess = useCallback(() => {
    setActiveTab('list')
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirm) {
      await deleteFriendLink(deleteConfirm)
    }
  }, [deleteConfirm, deleteFriendLink])

  // 处理解析申请文本
  const handleParseApplyText = useCallback(async (link: FriendLink) => {
    const parsed = await parseApplyText(link)
    if (parsed) {
      // 询问是否应用解析结果
      if (confirm('解析成功！是否应用解析结果到该友链？')) {
        await applyParsedData(link, parsed)
      }
    }
  }, [parseApplyText, applyParsedData])

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
          {/* 标签页导航 */}
          <div className="flex border-b border-[rgb(var(--border))]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange('publish')}
              className={`flex-1 py-2 lg:py-3 px-6 text-center transition-colors ${
                activeTab === 'publish'
                  ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] border-b-2 border-transparent'
              }`}
            >
              发布友链
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange('list')}
              className={`flex-1 py-2 lg:py-3 px-6 text-center transition-colors ${
                activeTab === 'list'
                  ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] border-b-2 border-transparent'
              }`}
            >
              友链列表
              {stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {stats.pending}待审
                </span>
              )}
            </motion.button>
          </div>

          {/* 发布友链内容 */}
          <AnimatePresence mode="wait">
            {activeTab === 'publish' && (
              <motion.div
                key="publish"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <PublishTab
                  loading={loading}
                  setLoading={setLoading}
                  onPublish={publishFriendLink}
                  onSuccess={handlePublishSuccess}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 友链列表内容 */}
          <AnimatePresence mode="wait">
            {activeTab === 'list' && (
              <motion.div
                key="list"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* 删除确认对话框 */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay))] flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))]/90 rounded-lg p-6 max-w-sm w-full border-[rgb(var(--border))]"
            >
              <h3 className="text-lg font-medium text-[rgb(var(--text))] mb-2">确认删除</h3>
              <p className="text-[rgb(var(--text-muted))] mb-6">确定要删除这个友链吗？此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500 transition-colors"
                >
                  确认删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
