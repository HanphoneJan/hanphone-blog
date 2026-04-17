'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, FileText, X } from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { ADMIN_ESSAY_LABELS } from '@/lib/labels'
import { useEssays } from './hooks/useEssays'
import { useEssayForm } from './hooks/useEssayForm'
import { useEssayFiles } from './hooks/useEssayFiles'
import { EssayForm } from './components/EssayForm'
import { EssayList } from './components/EssayList'
import type { Essay } from './types'

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

export default function EssayManagementPage() {
  const [activeKey, setActiveKey] = useState('first')
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [currentDeleteId, setCurrentDeleteId] = useState<number | null>(null)

  // 使用自定义Hooks
  const {
    filteredEssayList,
    loading,
    searchKeyword,
    setSearchKeyword,
    sortOrder,
    toggleSortOrder,
    updateRecommendLoading,
    toggleRecommend,
    deleteEssay,
    saveEssay,
    getEssayList,
    fetchData
  } = useEssays()

  const {
    essay,
    formErrors,
    isEditMode,
    setTitle,
    setContent,
    setEditEssay,
    resetForm,
    removeUploadedFile,
    validateForm,
    prepareEssayData
  } = useEssayForm()

  const {
    localFiles,
    deleteFileModalVisible,
    fileToDelete,
    handleFileSelect,
    openFileDeleteModal,
    closeFileDeleteModal,
    confirmFileDelete,
    uploadAllFiles,
    clearLocalFiles
  } = useEssayFiles(fetchData)

  // 切换标签页
  const handleTabChange = useCallback((key: string) => {
    setActiveKey(key)
    if (key === 'second') {
      getEssayList()
    }
  }, [getEssayList])

  // 发布/更新随笔
  const handlePublish = useCallback(async () => {
    if (!validateForm(localFiles.length)) return

    try {
      // 1. 先上传所有本地文件
      const uploadedFiles = await uploadAllFiles()

      // 2. 准备随笔数据
      const essayData = prepareEssayData(uploadedFiles)

      // 3. 提交随笔数据到服务器
      const success = await saveEssay(essayData)

      if (success) {
        // 重置表单
        resetForm()
        clearLocalFiles()
        // 切换到列表标签页
        setActiveKey('second')
      }
    } catch (error) {
      console.error('发布随笔失败:', error)
      showAlert(ADMIN_ESSAY_LABELS.PUBLISH_FAIL)
    }
  }, [validateForm, localFiles.length, uploadAllFiles, prepareEssayData, saveEssay, resetForm, clearLocalFiles])

  // 编辑随笔
  const handleEdit = useCallback((row: Essay) => {
    setEditEssay(row)
    clearLocalFiles()
    setActiveKey('first')
  }, [setEditEssay, clearLocalFiles])

  // 打开删除确认框
  const openDeleteModal = useCallback((id: number) => {
    setCurrentDeleteId(id)
    setDeleteModalVisible(true)
  }, [])

  // 关闭删除确认框
  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false)
    setCurrentDeleteId(null)
  }, [])

  // 确认删除随笔
  const confirmDelete = useCallback(async () => {
    if (!currentDeleteId) return

    const success = await deleteEssay(currentDeleteId)
    if (success) {
      closeDeleteModal()
    }
  }, [currentDeleteId, deleteEssay, closeDeleteModal])

  // 处理文件删除确认
  const handleFileDeleteConfirm = useCallback(async () => {
    await confirmFileDelete(removeUploadedFile)
  }, [confirmFileDelete, removeUploadedFile])

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden"
    >
      {/* 背景装饰 - 已移除 */}

      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 标签页切换 */}
        <motion.div
          variants={fadeInUpVariants}
          className="bg-[rgb(var(--card))]/80 backdrop-blur-sm lg:rounded-xl shadow border-[rgb(var(--border))] overflow-hidden mb-6"
        >
          <div className="flex border-b border-[rgb(var(--border))]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-2 lg:py-3 text-sm font-medium transition-colors flex-1 ${
                activeKey === 'first'
                  ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
              }`}
              onClick={() => handleTabChange('first')}
            >
              <Plus className="h-4 w-4 mr-2 inline-block" />
              新建随笔
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-4 text-sm font-medium transition-colors flex-1 ${
                activeKey === 'second'
                  ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
              }`}
              onClick={() => handleTabChange('second')}
            >
              <FileText className="h-4 w-4 mr-2 inline-block" />
              随笔管理
            </motion.button>
          </div>

          {/* 新建随笔内容 */}
          <AnimatePresence mode="wait">
            {activeKey === 'first' && (
              <motion.div
                key="first"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <EssayForm
              essay={essay}
              formErrors={formErrors}
              localFiles={localFiles}
              loading={loading}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onFileSelect={handleFileSelect}
              onOpenFileDeleteModal={openFileDeleteModal}
              onPublish={handlePublish}
            />
          </motion.div>
        )}
      </AnimatePresence>

          {/* 随笔管理列表 */}
          <AnimatePresence mode="wait">
            {activeKey === 'second' && (
              <motion.div
                key="second"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <EssayList
              essays={filteredEssayList}
              searchKeyword={searchKeyword}
              onSearchChange={setSearchKeyword}
              sortOrder={sortOrder}
              onToggleSort={toggleSortOrder}
              updateRecommendLoading={updateRecommendLoading}
              onToggleRecommend={toggleRecommend}
              onEdit={handleEdit}
              onDelete={openDeleteModal}
            />
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      </main>

      {/* 删除确认对话框 */}
      <AnimatePresence>
        {deleteModalVisible &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[rgb(var(--overlay))] flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[rgb(var(--card))]/90 rounded-lg p-6 max-w-sm mx-4"
              >
                <h3 className="text-lg font-medium text-[rgb(var(--text))] mb-4">确认删除</h3>
                <p className="text-[rgb(var(--text-muted))] mb-6">确定要删除这篇随笔吗？此操作不可撤销。</p>
                <div className="flex justify-end gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeDeleteModal}
                    className="px-4 py-2 rounded-lg bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                  >
                    确认删除
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>

      {/* 文件删除确认对话框 */}
      <AnimatePresence>
        {deleteFileModalVisible &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[rgb(var(--overlay))] flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[rgb(var(--card))]/90 rounded-lg p-6 max-w-sm mx-4"
              >
                <h3 className="text-lg font-medium text-[rgb(var(--text))] mb-4">确认删除文件</h3>
                <p className="text-[rgb(var(--text-muted))] mb-6">
                  确定要删除文件 &quot;{fileToDelete?.fileName}&quot; 吗？此操作不可撤销。
                </p>
                <div className="flex justify-end gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeFileDeleteModal}
                    className="px-4 py-2 rounded-lg bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition-colors"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFileDeleteConfirm}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                  >
                    确认删除
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </motion.div>
  )
}
