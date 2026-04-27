'use client'

import { useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { useProjects } from './hooks/useProjects'
import { useProjectForm } from './hooks/useProjectForm'
import { useProjectStats } from './hooks/useProjectStats'
import ProjectForm from './components/ProjectForm'
import ProjectList from './components/ProjectList'

// 动画变体定义
const pageVariants = {
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

const ProjectManagement = () => {
  const [activeTab, setActiveTab] = useState('list')

  const {
    projectList,
    filteredList,
    allFilteredList,
    loading,
    filters,
    localInputValues,
    deleteConfirm,
    updateRecommendLoading,
    updatePublishedLoading,
    currentPage,
    totalPages,
    getProjectList,
    setDeleteConfirm,
    handleDeleteConfirm,
    toggleRecommend,
    togglePublished,
    handleTypeChange,
    handleLocalInputChange,
    handleFilterChange,
    resetFilters,
    setEditingState,
    saveEdit,
    cancelEdit,
    showTagInput,
    confirmTagInput,
    removeTag,
    goToPage
  } = useProjects()

  const {
    formData,
    dialogImageUrl,
    loading: formLoading,
    uploadRef,
    imageUploadRef,
    handleInputChange,
    handleFileChange,
    handleImageFileChange,
    handleRemoveImage,
    publishProject
  } = useProjectForm(() => {
    setActiveTab('list')
    getProjectList()
  })

  const stats = useProjectStats(projectList)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'list') {
      getProjectList()
    }
  }

  // 编辑操作包装函数
  const handleEditTitle = (projectId: number | null) => setEditingState(projectId, 'editingTitle', true)
  const handleSaveTitle = (projectId: number | null) => saveEdit(projectId, 'title')
  const handleCancelEditTitle = (projectId: number | null) => cancelEdit(projectId, 'editingTitle')

  const handleEditContent = (projectId: number | null) => setEditingState(projectId, 'editingContent', true)
  const handleSaveContent = (projectId: number | null) => saveEdit(projectId, 'content')
  const handleCancelEditContent = (projectId: number | null) => cancelEdit(projectId, 'editingContent')

  const handleEditImage = (projectId: number | null) => setEditingState(projectId, 'editingImage', true)
  const handleSaveImage = (projectId: number | null) => saveEdit(projectId, 'imageUrl')
  const handleCancelEditImage = (projectId: number | null) => cancelEdit(projectId, 'editingImage')

  const handleEditUrl = (projectId: number | null) => setEditingState(projectId, 'editingUrl', true)
  const handleSaveUrl = (projectId: number | null) => saveEdit(projectId, 'url')
  const handleCancelEditUrl = (projectId: number | null) => cancelEdit(projectId, 'editingUrl')

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden"
    >
      {/* 背景装饰 - 已移除 */}

      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 主内容区卡片 */}
        <motion.div
          variants={fadeInUpVariants}
          className="bg-[rgb(var(--card))] backdrop-blur-sm lg:rounded-xl shadow-sm min-h-[100vh] border border-[rgb(var(--border))] overflow-hidden"
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
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] border-b-2 border-transparent'
              }`}
            >
              发布项目
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange('list')}
              className={`flex-1 py-2 lg:py-3 px-6 text-center transition-colors ${
                activeTab === 'list'
                  ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
              }`}
            >
              项目列表
            </motion.button>
          </div>

          {/* 发布项目内容 */}
          <AnimatePresence mode="wait">
            {activeTab === 'publish' && (
              <motion.div
                key="publish"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <ProjectForm
              formData={formData}
              dialogImageUrl={dialogImageUrl}
              loading={formLoading}
              uploadRef={uploadRef}
              onInputChange={handleInputChange}
              onFileChange={handleFileChange}
              onRemoveImage={handleRemoveImage}
              onSubmit={publishProject}
            />
          </motion.div>
        )}
      </AnimatePresence>

          {/* 项目列表内容 */}
          <AnimatePresence mode="wait">
            {activeTab === 'list' && (
              <motion.div
                key="list"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <ProjectList
              projects={projectList}
              filteredList={filteredList}
              loading={loading}
              filters={filters}
              localInputValues={localInputValues}
              stats={stats}
              updateRecommendLoading={updateRecommendLoading}
              updatePublishedLoading={updatePublishedLoading}
              imageUploadRef={imageUploadRef}
              onFilterChange={handleFilterChange}
              onResetFilters={resetFilters}
              onEditTitle={handleEditTitle}
              onSaveTitle={handleSaveTitle}
              onCancelEditTitle={handleCancelEditTitle}
              onEditContent={handleEditContent}
              onSaveContent={handleSaveContent}
              onCancelEditContent={handleCancelEditContent}
              onEditImage={handleEditImage}
              onSaveImage={handleSaveImage}
              onCancelEditImage={handleCancelEditImage}
              onEditUrl={handleEditUrl}
              onSaveUrl={handleSaveUrl}
              onCancelEditUrl={handleCancelEditUrl}
              onLocalInputChange={handleLocalInputChange}
              onTypeChange={handleTypeChange}
              onImageFileChange={handleImageFileChange}
              onShowTagInput={showTagInput}
              onConfirmTagInput={confirmTagInput}
              onRemoveTag={removeTag}
              onToggleRecommend={toggleRecommend}
              onTogglePublished={togglePublished}
              onDelete={setDeleteConfirm}
            />

                {/* 分页组件 */}
                {allFilteredList.length > 0 && (
                  <div className="px-6 py-4 border-t border-[rgb(var(--border))] flex items-center justify-between">
                    <div className="text-sm text-[rgb(var(--text-muted))]">
                      显示 {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, allFilteredList.length)} 条，共 {allFilteredList.length} 条
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgb(var(--hover))] transition-colors"
                      >
                        上一页
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-1 text-[rgb(var(--text-muted))]">...</span>
                            )}
                            <button
                              onClick={() => goToPage(p)}
                              className={`min-w-[28px] px-2 py-1 rounded-md text-sm transition-colors ${
                                p === currentPage
                                  ? 'bg-[rgb(var(--primary))] text-white'
                                  : 'border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                              }`}
                            >
                              {p}
                            </button>
                          </span>
                        ))}
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2.5 py-1 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgb(var(--hover))] transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
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
            className="fixed inset-0 bg-[rgb(var(--overlay)/0.5)] backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))] rounded-lg p-6 max-w-sm w-full border border-[rgb(var(--border))]"
            >
              <h3 className="text-lg font-medium text-[rgb(var(--text))] mb-2">确认删除</h3>
              <p className="text-[rgb(var(--text-muted))] mb-6">确定要删除这个项目吗？此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors"
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

export default ProjectManagement
