'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, Edit, Trash2, AlertCircle, Loader2, Search } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils' // 导入apiClient
import { showAlert } from '@/lib/Alert'
import { ADMIN_TAG_LABELS, COMMON_LABELS } from '@/lib/labels'

import { API_CODE } from '@/lib/constants'
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

// 定义标签数据类型
interface Tag {
  id: number
  name: string
  blogsNumber: number
}

// API调用函数（与其他页面保持一致）
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

export default function TagsManagementPage() {
  // 状态管理
  const [tagList, setTagList] = useState<Tag[]>([])
  const [filteredTagList, setFilteredTagList] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentTag, setCurrentTag] = useState<Partial<Tag>>({})
  const [formName, setFormName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 获取标签列表（使用useCallback优化）
  const getFullTagList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.GET_FULL_TAG_LIST_AND_BLOG_NUMBER)

      if (res.code === API_CODE.SUCCESS) {
        // 按博客数量排序（降序）
        const sortedTags = res.data.sort((a: Tag, b: Tag) => b.blogsNumber - a.blogsNumber)
        setTagList(sortedTags)
        setFilteredTagList(sortedTags)
      } else {
        console.log(res.message || '获取标签失败')
      }
    } catch (error) {
      console.log('获取标签列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面加载时获取标签列表
  useEffect(() => {
    getFullTagList()
  }, [getFullTagList])

  // 搜索功能
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredTagList(tagList)
    } else {
      const keyword = searchKeyword.toLowerCase().trim()
      const filtered = tagList.filter(tag => tag.name.toLowerCase().includes(keyword))
      setFilteredTagList(filtered)
    }
  }, [searchKeyword, tagList])

  // 打开新建/编辑对话框
  const handleOpenDialog = (tag?: Tag) => {
    setIsDialogOpen(true)
    if (tag) {
      setCurrentTag(tag)
      setFormName(tag.name)
    } else {
      setCurrentTag({})
      setFormName('')
    }
  }

  // 关闭对话框
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setFormName('')
  }

  // 创建或更新标签
  const handleSaveTag = async () => {
    if (!formName.trim()) {
      return showAlert(ADMIN_TAG_LABELS.NAME_REQUIRED)
    }

    try {
      setLoading(true)
      const tagData = {
        id: currentTag.id,
        name: formName.trim()
      }

      let res
      if (currentTag.id) {
        // 更新现有标签
        res = await fetchData(ENDPOINTS.ADMIN.TAGS, 'POST', {
          tag: tagData
        })
      } else {
        // 创建新标签
        res = await fetchData(ENDPOINTS.ADMIN.TAGS, 'POST', { tag: tagData })
      }

      if (res.code === API_CODE.SUCCESS) {
        showAlert(res.message || (currentTag.id ? ADMIN_TAG_LABELS.SAVE_SUCCESS : ADMIN_TAG_LABELS.CREATE_SUCCESS))
        handleCloseDialog()
        getFullTagList()
      } else {
        showAlert(res.message || ADMIN_TAG_LABELS.OPERATION_FAIL)
      }
    } catch (error) {
      console.error('保存标签失败:', error)
      showAlert(ADMIN_TAG_LABELS.SAVE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 删除标签
  const handleDeleteTag = async (id: number) => {
    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.ADMIN.TAGS}/${id}`, 'GET')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(res.message || ADMIN_TAG_LABELS.DELETE_SUCCESS)
        getFullTagList()
      } else {
        showAlert(res.message || COMMON_LABELS.DELETE_FAIL)
      }
    } catch (error) {
      console.error('删除标签失败:', error)
      showAlert(ADMIN_TAG_LABELS.DELETE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-blue-50 text-slate-800 relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, rgb(var(--bg)))', color: 'rgb(var(--text))' }}
    >
      {/* 背景装饰 - 已移除 */}

      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 主内容区卡片 */}
        <motion.div
          variants={fadeInUpVariants}
          className="bg-white/80 backdrop-blur-sm lg:rounded-xl shadow-sm min-h-[100vh] border border-slate-200/50 overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
        >
          {/* 操作栏：使用网格布局确保内容始终完全显示在一行 */}
          <div className="py-2 px-6 border-b border-slate-200/50 grid grid-cols-[auto_1fr_auto] items-center gap-4" style={{ borderColor: 'rgb(var(--border))' }}>
            {/* 标题：固定宽度，保证完整显示 */}
            <h2 className="text-base sm:text-lg md:text-xl text-blue-600 whitespace-nowrap">
              标签列表
            </h2>

            {/* 搜索框：可伸缩，占据剩余空间 */}
            <div className="relative min-w-[80px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="搜索..."
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all w-full text-sm"
              />
            </div>

            {/* 新建标签按钮：固定宽度，确保始终可见 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenDialog()}
              disabled={loading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                loading
                  ? 'bg-slate-300 text-slate-600'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm hidden sm:block">新建标签</span>
            </motion.button>
          </div>

          {/* 标签列表区域 */}
          <div className="p-3 min-h-[90vh]">
            {loading ? (
              // 加载状态骨架屏
              <div className="space-y-4 h-[400px] flex flex-col justify-center">
                {[1, 2, 3, 4, 5, 6].map(item => (
                  <div key={item} className="animate-pulse bg-slate-200/50 rounded-lg h-24"></div>
                ))}
              </div>
            ) : filteredTagList.length > 0 ? (
              // 标签网格布局（响应式设计）
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredTagList.map(tag => (
                  <motion.div
                    key={tag.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.03, y: -3 }}
                    className="bg-white/60 border border-slate-200/50 rounded-lg px-3 py-2 lg:p-4 hover:bg-slate-100/80 transition-all duration-300 hover:shadow-md relative group"
                  >
                    {/* 操作按钮（悬停显示） */}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenDialog(tag)}
                        className="p-1.5 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(tag.id)}
                        className="p-1.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 标签内容 - 修改为同一行显示 */}
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-blue-600 text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          标签名称
                        </p>
                        <p className="text-blue-500 text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          {tag.name}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-slate-600 text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          关联博客
                        </p>
                        <p className="text-green-500 text-[clamp(0.8rem,3vw,0.9rem)] sm:text-base">
                          {tag.blogsNumber} 篇
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              // 空状态
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <div className="text-slate-500 mb-4">
                  <Plus className="h-12 mx-auto" />
                </div>
                <p className="text-slate-400">
                  {searchKeyword ? '未找到匹配的标签' : '暂无标签数据'}
                </p>
                {searchKeyword ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchKeyword('')}
                    className="mt-4 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors text-sm"
                  >
                    清除搜索
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenDialog()}
                    disabled={loading}
                    className="mt-4 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm"
                  >
                    创建第一个标签
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* 编辑/创建标签对话框 */}
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay)/0.5)] backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-blue-600 mb-4">
                {currentTag.id ? '编辑标签' : '新建标签'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">标签名称</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    placeholder="请输入标签名称"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCloseDialog}
                  className="px-3 sm:px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveTag}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  提交
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay)/0.5)] backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-blue-600 mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-400" />
                确认删除
              </h3>
              <p className="text-slate-600 mb-5 sm:mb-6 text-sm sm:text-base">
                此操作将永久删除该标签，是否继续？
              </p>
              <div className="flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 sm:px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleDeleteTag(confirmDelete)
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
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" style={{ borderColor: 'rgb(var(--primary))' }}></div>
        </div>
      )}
    </motion.div>
  )
}