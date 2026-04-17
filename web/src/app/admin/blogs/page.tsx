'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_BLOG_LABELS } from '@/lib/labels'

import { useBlogs } from './hooks/useBlogs'
import { useBlogFilters } from './hooks/useBlogFilters'
import { useTags } from './hooks/useTags'
import { useImageUpload } from './hooks/useImageUpload'
import { useScreenWidth } from './utils/blogHelpers'

import { BlogFilters } from './components/BlogFilters'
import { BlogTable } from './components/BlogTable'
import { BlogCard } from './components/BlogCard'
import { TypeDialog } from './components/dialogs/TypeDialog'
import { FlagDialog } from './components/dialogs/FlagDialog'
import { CoverDialog } from './components/dialogs/CoverDialog'
import { EditDialog } from './components/dialogs/EditDialog'

import type { Blog, Type, Tag, EditBlogForm } from './types'

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

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4
    }
  }
}

export default function BlogManagementPage() {
  // Hooks
  const {
    blogList,
    setBlogList,
    totalcount,
    loading,
    updateRecommendLoading,
    updatePublishedLoading,
    getBlogList,
    removeBlogById,
    updateBlogField,
    togglePublish
  } = useBlogs()

  const {
    queryInfo,
    pagenum,
    pagesize,
    selectedType,
    setPagenum,
    setSelectedType,
    handleTypeSelect,
    clearSearch,
    handleSearch,
    generatePageNumbers
  } = useBlogFilters()

  const screenWidth = useScreenWidth()

  // 标签管理
  const [tagList, setTagList] = useState<Tag[]>([])

  // 图片上传
  const {
    uploadRef,
    uploadProgress,
    isUploading,
    dialogImageUrl,
    setDialogImageUrl,
    handleFileChange,
    handleRemoveImage,
    resetImage
  } = useImageUpload()

  // 模态框状态
  const [editTypeDialogVisible, setEditTypeDialogVisible] = useState(false)
  const [editPicDialogVisible, setEditPicDialogVisible] = useState(false)
  const [editBlogDialogVisible, setEditBlogDialogVisible] = useState(false)
  const [editFlagDialogVisible, setEditFlagDialogVisible] = useState(false)

  // 当前操作的博客
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null)
  const [selectedFlag, setSelectedFlag] = useState<string>('')
  const [editBlogForm, setEditBlogForm] = useState<EditBlogForm>({
    title: '',
    content: '',
    description: ''
  })

  // 分类列表
  const [typeList, setTypeList] = useState<Type[]>([])

  // 通用API调用
  const fetchData = useCallback(async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })
      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      showAlert(ADMIN_BLOG_LABELS.OPERATION_FAIL)
      return { code: 500, data: null }
    }
  }, [])

  // 标签管理Hook
  const {
    editInputRef,
    showInput,
    handleInputConfirm,
    handleTagClose,
    handleEnterKeyPress
  } = useTags({ tagList, setTagList, setBlogList, fetchData })

  // 初始化数据
  useEffect(() => {
    const fetchInitialData = async () => {
      await getBlogList(queryInfo, pagenum, pagesize)
      await getFullTypeList()
      await getFullTagList()
    }
    fetchInitialData()
  }, [pagenum, pagesize])

  // 获取所有分类
  const getFullTypeList = async () => {
    const data = await fetchData(ENDPOINTS.ADMIN.FULL_TYPE_LIST)
    if (data.code === 200) {
      setTypeList(data.data)
    } else {
      showAlert(ADMIN_BLOG_LABELS.FETCH_TYPE_FAIL)
    }
  }

  // 获取所有标签
  const getFullTagList = async () => {
    const data = await fetchData(ENDPOINTS.ADMIN.FULL_TAG_LIST)
    if (data.code === 200) {
      setTagList(data.data)
    } else {
      showAlert(ADMIN_BLOG_LABELS.FETCH_TAG_FAIL)
    }
  }

  // 搜索博客
  const handleSearchClick = () => {
    setPagenum(1)
    getBlogList(queryInfo, 1, pagesize)
  }

  // 清除搜索
  const handleClearSearch = () => {
    clearSearch()
    getBlogList({ title: '', typeId: null }, 1, pagesize)
  }

  // 分类选择
  const handleTypeSelectWithList = (typeName: string) => {
    handleTypeSelect(typeName, typeList)
  }

  // 删除博客
  const handleRemoveBlog = (id: number) => {
    removeBlogById(id, () => getBlogList(queryInfo, pagenum, pagesize))
  }

  // 推荐状态切换
  const handleToggleRecommend = async (blog: Blog) => {
    const success = await updateBlogField(
      blog,
      { recommend: !blog.recommend },
      blog.recommend ? ADMIN_BLOG_LABELS.UNRECOMMEND_SUCCESS : ADMIN_BLOG_LABELS.RECOMMEND_SUCCESS,
      blog.recommend ? ADMIN_BLOG_LABELS.UNRECOMMEND_FAIL : ADMIN_BLOG_LABELS.RECOMMEND_FAIL
    )
    if (success) {
      setBlogList(prev =>
        prev.map(item => (item.id === blog.id ? { ...item, recommend: !blog.recommend } : item))
      )
    }
  }

  // 发布状态切换
  const handleTogglePublish = async (blog: Blog) => {
    const success = await togglePublish(blog)
    if (success) {
      setBlogList(prev =>
        prev.map(item => (item.id === blog.id ? { ...item, published: !blog.published } : item))
      )
    }
  }

  // 打开编辑博客弹窗
  const openEditBlogDialog = (blog: Blog) => {
    setCurrentBlog(blog)
    setEditBlogForm({
      title: blog.title,
      content: blog.content,
      description: blog.description || ''
    })
    setEditBlogDialogVisible(true)
  }

  // 保存博客编辑
  const saveBlogEdit = async () => {
    if (!currentBlog) return
    const success = await updateBlogField(
      currentBlog,
      {
        title: editBlogForm.title,
        content: editBlogForm.content,
        description: editBlogForm.description
      },
      ADMIN_BLOG_LABELS.MODIFY_SUCCESS,
      ADMIN_BLOG_LABELS.MODIFY_FAIL
    )
    if (success) {
      setEditBlogDialogVisible(false)
      getBlogList(queryInfo, pagenum, pagesize)
    }
  }

  // 打开修改分类弹窗
  const openChangeTypeDialog = (blog: Blog) => {
    setCurrentBlog(blog)
    setSelectedType(blog.type.name)
    setEditTypeDialogVisible(true)
  }

  // 提交分类修改
  const submitTypeChange = async () => {
    if (!currentBlog) return
    const type = typeList.find(t => t.name === selectedType)
    if (!type) {
      showAlert(ADMIN_BLOG_LABELS.TYPE_REQUIRED)
      return
    }
    const success = await updateBlogField(
      currentBlog,
      { type },
      ADMIN_BLOG_LABELS.TYPE_CHANGE_SUCCESS,
      ADMIN_BLOG_LABELS.TYPE_CHANGE_FAIL
    )
    if (success) {
      setEditTypeDialogVisible(false)
      getBlogList(queryInfo, pagenum, pagesize)
    }
  }

  // 打开修改flag弹窗
  const openChangeFlagDialog = (blog: Blog) => {
    setCurrentBlog(blog)
    setSelectedFlag(blog.flag || '原创')
    setEditFlagDialogVisible(true)
  }

  // 提交flag修改
  const submitFlagChange = async () => {
    if (!currentBlog) return
    const success = await updateBlogField(
      currentBlog,
      { flag: selectedFlag },
      ADMIN_BLOG_LABELS.FLAG_CHANGE_SUCCESS,
      ADMIN_BLOG_LABELS.FLAG_CHANGE_FAIL
    )
    if (success) {
      setEditFlagDialogVisible(false)
      getBlogList(queryInfo, pagenum, pagesize)
    }
  }

  // 打开修改首图弹窗
  const openEditPicDialog = (blog: Blog) => {
    setCurrentBlog(blog)
    setDialogImageUrl(blog.firstPicture)
    setEditPicDialogVisible(true)
  }

  // 提交首图修改
  const submitPicChange = async () => {
    if (!currentBlog || !dialogImageUrl) {
      showAlert(ADMIN_BLOG_LABELS.IMAGE_REQUIRED)
      return
    }
    const success = await updateBlogField(
      currentBlog,
      { firstPicture: dialogImageUrl },
      ADMIN_BLOG_LABELS.COVER_UPDATE_SUCCESS,
      ADMIN_BLOG_LABELS.COVER_UPDATE_FAIL
    )
    if (success) {
      setEditPicDialogVisible(false)
      resetImage()
      getBlogList(queryInfo, pagenum, pagesize)
    }
  }

  // 处理标签输入变化
  const handleInputChange = (blogId: number, value: string) => {
    setBlogList(prev =>
      prev.map(item =>
        item.id === blogId ? { ...item, inputValue: value } : item
      )
    )
  }

  // 分页页码
  const pageNumbers = generatePageNumbers(totalcount, screenWidth)

  return (
    <motion.div 
      className="font-sans min-h-screen bg-gradient-to-b from-[rgb(var(--hover))] via-[rgb(var(--card))] to-[rgb(var(--hover))] text-[rgb(var(--text))] dark:bg-gradient-to-b dark:from-[rgb(var(--bg))] dark:via-[rgb(var(--card))] dark:to-[rgb(var(--bg))] dark:text-[rgb(var(--text))]"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(50,100,200,0.1)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(80,120,250,0.1)_0%,transparent_40%)] dark:opacity-100 opacity-0"></div>

      <main className="max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 搜索筛选区域 */}
        <motion.div variants={fadeInUpVariants}>
          <BlogFilters
            queryTitle={queryInfo.title}
            selectedType={selectedType}
            typeList={typeList}
            loading={loading}
            onSearchChange={handleSearch}
            onTypeSelect={handleTypeSelectWithList}
            onClear={handleClearSearch}
            onSearch={handleSearchClick}
          />
        </motion.div>

        {/* 博客表格 - 桌面端 */}
        <motion.div variants={fadeInUpVariants}>
          <BlogTable
            blogList={blogList}
            typeList={typeList}
            updateRecommendLoading={updateRecommendLoading}
            updatePublishedLoading={updatePublishedLoading}
            inputRef={editInputRef}
            onOpenEditDialog={openEditBlogDialog}
            onOpenPicDialog={openEditPicDialog}
            onRemoveBlog={handleRemoveBlog}
            onOpenTypeDialog={openChangeTypeDialog}
            onOpenFlagDialog={openChangeFlagDialog}
            onToggleRecommend={handleToggleRecommend}
            onTogglePublish={handleTogglePublish}
            onShowInput={showInput}
            onInputConfirm={handleInputConfirm}
            onTagClose={handleTagClose}
            onEnterKeyPress={handleEnterKeyPress}
            onInputChange={handleInputChange}
          />
        </motion.div>

        {/* 博客卡片 - 移动端 */}
        <AnimatePresence>
          {blogList.length > 0 ? (
            blogList.map((blog, index) => (
              <motion.div
                key={blog.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <BlogCard
                  blog={blog}
                  updateRecommendLoading={updateRecommendLoading}
                  updatePublishedLoading={updatePublishedLoading}
                  inputRef={editInputRef}
                  onOpenEditDialog={openEditBlogDialog}
                  onOpenPicDialog={openEditPicDialog}
                  onRemoveBlog={handleRemoveBlog}
                  onOpenTypeDialog={openChangeTypeDialog}
                  onOpenFlagDialog={openChangeFlagDialog}
                  onToggleRecommend={handleToggleRecommend}
                  onTogglePublish={handleTogglePublish}
                  onShowInput={showInput}
                  onInputConfirm={handleInputConfirm}
                  onTagClose={handleTagClose}
                  onEnterKeyPress={handleEnterKeyPress}
                  onInputChange={handleInputChange}
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              className="text-center min-h-[90vh] py-12 text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <FolderOpen className="h-12 w-12 mx-auto mt-20 mb-4 opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 分页 */}
        <AnimatePresence>
          {totalcount > 0 && (
            <motion.div 
              className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="text-sm text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]">
                共 <span className="font-medium text-[rgb(var(--primary))] dark:text-[rgb(var(--primary))]">{totalcount}</span> 条记录
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => setPagenum(prev => Math.max(1, prev - 1))}
                  disabled={pagenum === 1}
                  className="px-3 py-2 rounded-lg transition-all text-sm bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] disabled:opacity-50 dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  上一页
                </motion.button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]">
                        ...
                      </span>
                    ) : (
                      <motion.button
                        key={page}
                        onClick={() => setPagenum(page as number)}
                        className={`px-3 py-1 rounded-lg transition-all text-sm ${
                          pagenum === page
                            ? 'bg-[rgb(var(--primary))] text-white dark:bg-[rgb(var(--primary))]'
                            : 'bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))] dark:text-[rgb(var(--text))]'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {page}
                      </motion.button>
                    )
                  )}
                </div>

                <motion.button
                  onClick={() =>
                    setPagenum(prev => Math.min(Math.ceil(totalcount / pagesize), prev + 1))
                  }
                  disabled={pagenum >= Math.ceil(totalcount / pagesize)}
                  className="px-3 py-2 rounded-lg transition-all text-sm bg-[rgb(var(--muted))/0.6] hover:bg-[rgb(var(--muted))] disabled:opacity-50 dark:bg-[rgb(var(--muted))/0.4] dark:hover:bg-[rgb(var(--muted))]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  下一页
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 模态框 */}
      <AnimatePresence>
        {editTypeDialogVisible && (
          <TypeDialog
            visible={editTypeDialogVisible}
            selectedType={selectedType}
            typeList={typeList}
            currentBlog={currentBlog}
            onClose={() => setEditTypeDialogVisible(false)}
            onSelect={setSelectedType}
            onSubmit={submitTypeChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editFlagDialogVisible && (
          <FlagDialog
            visible={editFlagDialogVisible}
            selectedFlag={selectedFlag}
            currentBlog={currentBlog}
            onClose={() => setEditFlagDialogVisible(false)}
            onSelect={setSelectedFlag}
            onSubmit={submitFlagChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editPicDialogVisible && (
          <CoverDialog
            visible={editPicDialogVisible}
            dialogImageUrl={dialogImageUrl}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            currentBlog={currentBlog}
            uploadRef={uploadRef}
            onClose={() => {
              setEditPicDialogVisible(false)
              resetImage()
            }}
            onUpload={() => uploadRef.current?.click()}
            onFileChange={handleFileChange}
            onRemoveImage={handleRemoveImage}
            onSubmit={submitPicChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editBlogDialogVisible && (
          <EditDialog
            visible={editBlogDialogVisible}
            form={editBlogForm}
            currentBlog={currentBlog}
            onClose={() => setEditBlogDialogVisible(false)}
            onChange={(field, value) => setEditBlogForm(prev => ({ ...prev, [field]: value }))}
            onSubmit={saveBlogEdit}
          />
        )}
      </AnimatePresence>

      {/* 全局加载指示器 */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary))] dark:border-[rgb(var(--primary))]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
