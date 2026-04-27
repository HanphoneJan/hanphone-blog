'use client'
import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Upload as UploadIcon,
  X,
  Search
} from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { ADMIN_TYPE_LABELS, COMMON_LABELS } from '@/lib/labels'
import { PicResponse } from '@/types/response'
import Compressor from 'compressorjs'

import {  API_CODE , IMAGE } from '@/lib/constants'
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
} as const

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
} as const

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4
    }
  }
} as const

// 定义分类数据类型
interface Category {
  id: number
  name: string
  pic_url: string
  color?: string
  blogs: { id: number }[]
}

// 定义上传文件类型
interface UploadFile {
  uid: string
  name: string
  url: string
}

// API调用函数（与标签管理保持一致）
const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
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
    return { code: 500, data: null }
  }
}

export default function CategoryManagement() {
  // 状态管理
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [filteredCategoryList, setFilteredCategoryList] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null)
  const [formName, setFormName] = useState('')
  const [formPicUrl, setFormPicUrl] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false) // 新增上传状态
  const [searchKeyword, setSearchKeyword] = useState('')
  const uploadRef = useRef<HTMLInputElement>(null) // 上传input的ref

  // 获取分类列表
  const getFullCategoryList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.FULL_TYPE_LIST)

      if (res.code === API_CODE.SUCCESS) {
        // 按博客数量排序（降序）
        const sortedCategories = res.data.sort(
          (a: Category, b: Category) => b.blogs.length - a.blogs.length
        )
        setCategoryList(sortedCategories)
        setFilteredCategoryList(sortedCategories)
      } else {
        console.log(res.message || '获取分类失败')
        showAlert(res.message || ADMIN_TYPE_LABELS.FETCH_FAIL)
      }
    } catch (error) {
      console.log('获取分类列表失败:', error)
      showAlert(ADMIN_TYPE_LABELS.FETCH_LIST_FAIL)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化加载数据
  useEffect(() => {
    getFullCategoryList()
  }, [getFullCategoryList])

  // 搜索功能
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredCategoryList(categoryList)
    } else {
      const keyword = searchKeyword.toLowerCase().trim()
      const filtered = categoryList.filter(category =>
        category.name.toLowerCase().includes(keyword)
      )
      setFilteredCategoryList(filtered)
    }
  }, [searchKeyword, categoryList])

  // 处理图片预览
  const handlePreview = (file: UploadFile) => {
    setPreviewImage(file.url || '')
    setPreviewVisible(true)
  }

  // 处理图片移除
  const handleRemove = () => {
    setFileList([])
    setPreviewImage('')
    setFormPicUrl('')
  }

  // 处理图片上传成功
  const handleUploadSuccess = (data: PicResponse) => {
    if (data.code === API_CODE.SUCCESS) {
      // 修改：检查code而不是status
      const url = data.url
      // 更新文件列表确保图片回显
      setFileList([{ uid: Date.now().toString(), name: 'category-image', url }])
      setPreviewImage(url)
      setFormPicUrl(url)
    } else {
      showAlert(data.message || ADMIN_TYPE_LABELS.UPLOAD_FAIL)
    }
  }

  // 处理文件选择和压缩
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    // 保存原始文件名（不含扩展名）和扩展名
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = 'jpeg' // 统一使用jpeg扩展名
    const newFileName = `${originalName}.${fileExtension}`

    // 使用Compressor压缩图片
    new Compressor(file, {
      quality: 0.8, // 压缩质量，0-1之间
      maxWidth: IMAGE.MAX_WIDTH,
      maxHeight: IMAGE.MAX_HEIGHT,
      mimeType: 'image/jpeg', // 确保MIME类型正确
      convertSize: 102400, // 小于100KB的图片也进行转换
      success: async compressedResult => {
        try {
          setUploading(true)

          // 将压缩后的blob转换为File对象，并保持原始文件名（修改扩展名为jpeg）
          const compressedFile = new File([compressedResult], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })

          const formData = new FormData()
          formData.append('namespace', 'blog/type')
          formData.append('file', compressedFile) // 使用带有原始文件名的压缩文件

          const response = await apiClient({
            url: ENDPOINTS.FILE.UPLOAD,
            method: 'POST',
            data: formData
          })
          const data = response.data
          handleUploadSuccess(data)
        } catch (error) {
          console.error('上传失败:', error)
          showAlert(ADMIN_TYPE_LABELS.UPLOAD_FAIL)
        } finally {
          setUploading(false)
          if (uploadRef.current) uploadRef.current.value = ''
        }
      },
      error: err => {
        console.error('图片压缩失败:', err)
        showAlert(ADMIN_TYPE_LABELS.IMAGE_COMPRESS_FAIL)
        setUploading(false)
        if (uploadRef.current) uploadRef.current.value = ''
      }
    })
  }

  // 打开新增/编辑对话框
  const handleOpenDialog = (category?: Category) => {
    setIsDialogOpen(true)
    if (category) {
      setCurrentCategory(category)
      setFormName(category.name)
      setFormPicUrl(category.pic_url)
      setFileList(
        category.pic_url
          ? [{ uid: category.id.toString(), name: 'category-image', url: category.pic_url }]
          : []
      )
      setPreviewImage(category.pic_url || '')
    } else {
      setCurrentCategory(null)
      setFormName('')
      setFormPicUrl('')
      setFileList([])
      setPreviewImage('')
    }
  }

  // 关闭对话框
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  // 提交表单（新增或编辑）
  const handleSaveCategory = async () => {
    if (!formName.trim()) {
      return showAlert(ADMIN_TYPE_LABELS.NAME_REQUIRED)
    }

    try {
      setLoading(true)
      // 统一数据结构，确保被type字段包裹
      const payload = {
        type: {
          id: currentCategory?.id,
          name: formName.trim(),
          pic_url: formPicUrl,
          color: null
        }
      }

      let res
      if (currentCategory?.id) {
        // 更新现有分类
        res = await fetchData(ENDPOINTS.ADMIN.TYPES, 'POST', payload)
      } else {
        // 创建新分类 - 确保数据被type字段包裹
        res = await fetchData(ENDPOINTS.ADMIN.TYPES, 'POST', payload)
      }

      if (res.code === API_CODE.SUCCESS) {
        showAlert(res.message || (currentCategory?.id ? ADMIN_TYPE_LABELS.SAVE_SUCCESS : ADMIN_TYPE_LABELS.CREATE_SUCCESS))
        handleCloseDialog()
        getFullCategoryList()
      } else {
        showAlert(res.message || ADMIN_TYPE_LABELS.OPERATION_FAIL)
      }
    } catch (error) {
      console.error('保存分类失败:', error)
      showAlert(ADMIN_TYPE_LABELS.SAVE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 删除分类
  const handleDeleteCategory = async (id: number) => {
    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.ADMIN.TYPES}/${id}`, 'GET')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(res.message || ADMIN_TYPE_LABELS.DELETE_SUCCESS)
        getFullCategoryList()
      } else {
        showAlert(res.message || COMMON_LABELS.DELETE_FAIL)
      }
    } catch (error) {
      console.error('删除分类失败:', error)
      showAlert(ADMIN_TYPE_LABELS.DELETE_FAIL)
    } finally {
      setLoading(false)
    }
  }

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
          className="bg-[rgb(var(--card))] backdrop-blur-sm lg:rounded-xl shadow-sm border border-[rgb(var(--border))] overflow-hidden"
        >
          {/* 操作栏：使用网格布局确保内容始终完全显示在一行 */}
          <div className="py-2 px-6 border-b border-[rgb(var(--border))] grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* 标题：固定宽度，保证完整显示 */}
            <h2 className="text-base sm:text-lg md:text-xl text-[rgb(var(--primary))] whitespace-nowrap">
              分类列表
            </h2>

            {/* 搜索框：可伸缩，占据剩余空间 */}
            <div className="relative min-w-[80px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="搜索..."
                className="pl-10 pr-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all w-full text-sm"
              />
            </div>

            {/* 新建分类按钮：固定宽度，确保始终可见 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenDialog()}
              disabled={loading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                loading
                  ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                  : 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white hover:shadow-md'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm hidden sm:block">新建分类</span>
            </motion.button>
          </div>

          {/* 分类列表区域 */}
          <div className="p-3 min-h-[90vh]">
            {loading ? (
              // 加载状态骨架屏
              <div className="space-y-4 h-[400px] flex flex-col justify-center">
                {[1, 2, 3, 4, 5, 6].map(item => (
                  <div key={item} className="animate-pulse bg-[rgb(var(--hover))] rounded-lg h-24"></div>
                ))}
              </div>
            ) : filteredCategoryList.length > 0 ? (
              // 分类网格布局
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredCategoryList.map((category, index) => (
                  // 分类卡片
                  <motion.div
                    key={category.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.03, y: -3 }}
                    className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 lg:p-4 hover:bg-[rgb(var(--hover))] transition-all duration-300 hover:shadow-md relative group"
                  >
                    {/* 操作按钮（悬停显示） */}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenDialog(category)}
                        className="p-1.5 rounded-full text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/10 transition-colors"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(category.id)}
                        className="p-1.5 rounded-full text-[rgb(var(--text-muted))] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 分类内容 */}
                    <div className="pt-1 space-y-1">
                      {/* 序号 */}
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[rgb(var(--primary))]/10 flex items-center justify-center">
                          <span className="text-[rgb(var(--primary))] font-medium text-sm">{index + 1}</span>
                        </div>
                      </div>

                      {/* 分类图片 */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-[rgb(var(--border))] mb-2 flex items-center justify-center bg-[rgb(var(--hover))] mx-auto">
                        <Image
                          src={category.pic_url}
                          alt={category.name}
                          width={96}
                          height={96}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* 分类名称 - 修改为同一行显示 */}
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[rgb(var(--primary))] text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          分类名称
                        </p>
                        <p className="text-[rgb(var(--primary))] text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          {category.name}
                        </p>
                      </div>

                      {/* 关联博客 - 同一行显示 */}
                      <div className="flex items-center justify-between">
                        <p className="text-[rgb(var(--text-muted))] text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          关联博客
                        </p>
                        <p className="text-green-500 text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          {category.blogs.length} 篇
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              // 空状态
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <div className="text-[rgb(var(--text-muted))] mb-4">
                  <Plus className="h-12 mx-auto" />
                </div>
                <p className="text-[rgb(var(--text-muted))]">
                  {searchKeyword ? '未找到匹配的分类' : '暂无分类数据'}
                </p>
                {searchKeyword ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchKeyword('')}
                    className="mt-4 px-4 py-2 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))] text-[rgb(var(--text))] transition-colors text-sm"
                  >
                    清除搜索
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenDialog()}
                    disabled={loading}
                    className="mt-4 px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white transition-colors text-sm"
                  >
                    创建第一个分类
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* 编辑/创建分类对话框 */}
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay))]/0.6 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
            <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))] mb-4">
              {currentCategory?.id ? '编辑分类' : '新建分类'}
            </h3>

            <div className="space-y-4">
              {/* 分类名称输入 */}
              <div>
                <label className="block text-sm text-[rgb(var(--text))] mb-1">分类名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                  placeholder="请输入分类名称"
                />
              </div>

              {/* 图片上传区域 */}
              <div>
                <label className="block text-sm text-[rgb(var(--text))] mb-2">封面图片</label>
                <div className="border-2 border-dashed border-[rgb(var(--border))] rounded-lg p-4 hover:border-[rgb(var(--primary))] transition-colors relative">
                  {fileList.length > 0 ? (
                    <div className="relative">
                      <Image
                        src={fileList[0].url}
                        alt="预览"
                        width={300}
                        height={200}
                        className="h-40 w-full object-cover rounded-md"
                      />
                      <button
                        onClick={handleRemove}
                        className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePreview(fileList[0])}
                        className="absolute bottom-2 right-2 bg-[rgb(var(--primary))]/80 p-1 rounded-full text-white hover:bg-[rgb(var(--primary))] transition-colors"
                      >
                        <UploadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label
                        htmlFor="category-upload"
                        className={`flex flex-col items-center justify-center cursor-pointer text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] ${
                          uploading ? 'opacity-70' : ''
                        }`}
                      >
                        <UploadIcon className="h-10 w-10 mb-2" />
                        <span className="text-sm">点击上传图片</span>
                      </label>
                      <input
                        ref={uploadRef}
                        id="category-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                    </>
                  )}

                  {/* 上传加载指示器 */}
                  {uploading && (
                    <div className="absolute inset-0 bg-[rgb(var(--bg))]/70 flex items-center justify-center rounded-md">
                      <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--primary))]" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  图片将自动压缩为JPEG格式，最大尺寸1200x1200px，保持原始文件名
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCloseDialog}
                className="px-3 sm:px-4 py-2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
              >
                取消
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveCategory}
                disabled={loading || uploading}
                className="px-3 sm:px-4 py-2 rounded-md bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] transition-colors flex items-center gap-2 text-sm"
              >
                {(loading || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                提交
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 图片预览对话框 */}
      {previewVisible && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setPreviewVisible(false)}
              className="absolute -top-10 right-0 text-white hover:text-[rgb(var(--text-muted))] transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <Image
              src={previewImage}
              alt="预览"
              width={800}
              height={600}
              className="max-h-[80vh] w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {confirmDelete !== null && (
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
              className="bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))] mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-400" />
                确认删除
              </h3>
              <p className="text-[rgb(var(--text))] mb-5 sm:mb-6 text-sm sm:text-base">
                此操作将永久删除该分类，是否继续？
              </p>
              <div className="flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 sm:px-4 py-2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleDeleteCategory(confirmDelete)
                    setConfirmDelete(null)
                  }}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-2 text-sm"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  确认删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全局加载指示器 */}
      {loading && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
        </div>
      )}
    </motion.div>
  )
}