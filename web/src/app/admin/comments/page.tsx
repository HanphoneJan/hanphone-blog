'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Delete, Loader2, AlertCircle, Search,  X } from 'lucide-react'
import Link from 'next/link'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import {  ASSETS , API_CODE } from '@/lib/constants'
import { ADMIN_COMMENT_LABELS } from '@/lib/labels'

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

// 定义类型接口
interface Blog {
  id: number
  title: string
}

interface Comment {
  id: number
  avatar: string
  nickname: string
  createTime: string
  blog: Blog
  content: string
}

// API调用函数
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

export default function CommentsPage() {
  // 状态管理
  const [commentList, setCommentList] = useState<Comment[]>([])
  const [filteredCommentList, setFilteredCommentList] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedBlog, setSelectedBlog] = useState<string>('all')
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 获取评论列表（后端限制200条，前端本地分页）
  const getCommentList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.COMMMENT_LIST)

      if (res.code === API_CODE.SUCCESS) {
        // 后端返回 List（最多200条）
        const comments = Array.isArray(res.data) ? res.data : (res.data?.content || [])
        setCommentList(comments)
      } else {
        showAlert(ADMIN_COMMENT_LABELS.FETCH_LIST_FAIL)
      }
    } catch (error) {
      console.error('获取评论列表失败:', error)
      showAlert(ADMIN_COMMENT_LABELS.FETCH_LIST_FAIL)
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索和筛选功能（重置到第一页）
  const handleSearchAndFilter = useCallback(() => {
    let filtered = commentList

    // 按博客筛选
    if (selectedBlog !== 'all') {
      filtered = filtered.filter(comment => comment.blog.id.toString() === selectedBlog)
    }

    // 按关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim()
      filtered = filtered.filter(
        comment =>
          comment.content.toLowerCase().includes(keyword) ||
          comment.nickname.toLowerCase().includes(keyword) ||
          comment.blog.title.toLowerCase().includes(keyword)
      )
    }

    setFilteredCommentList(filtered)
    setCurrentPage(1) // 筛选时重置到第一页
  }, [commentList, searchKeyword, selectedBlog])

  // 当搜索条件或博客筛选变化时更新列表
  useEffect(() => {
    handleSearchAndFilter()
  }, [handleSearchAndFilter])

  // 前端本地分页：计算当前页显示的数据
  const paginatedComments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCommentList.slice(start, start + pageSize)
  }, [filteredCommentList, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredCommentList.length / pageSize))

  // 当总页数变化时，确保当前页不超出范围
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // 获取唯一的博客列表用于筛选
  const blogOptions = Array.from(
    new Map(commentList.map(comment => [comment.blog.id, comment.blog])).values()
  )

  // 删除评论
  const deleteCommentById = async (id: number) => {
    setDeleteConfirm(id)
  }

  // 确认删除评论
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.COMMENTS}/${deleteConfirm}`, 'DELETE')

      if (res.code === API_CODE.SUCCESS) {
        showAlert(ADMIN_COMMENT_LABELS.DELETE_SUCCESS)
        getCommentList()
      } else {
        showAlert(res.message || '评论删除失败')
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      showAlert(ADMIN_COMMENT_LABELS.DELETE_FAIL)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  // 组件挂载时获取评论列表
  useEffect(() => {
    getCommentList()
  }, [])

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 清除搜索关键词
  const clearSearch = () => {
    setSearchKeyword('')
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
        <div className="bg-[rgb(var(--card))]/80 backdrop-blur-sm lg:rounded-xl shadow-sm min-h-[100vh] border-[rgb(var(--border))] overflow-hidden">
          {/* 操作栏：优化布局防止溢出 */}
          <div className="py-2 px-4 border-b border-[rgb(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-[320px]">
            {/* 标题和统计信息行 */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <h2 className="text-base sm:text-lg text-[rgb(var(--primary))] whitespace-nowrap shrink-0">
                评论管理
              </h2>

              {/* 统计信息 - 确保不会被覆盖 */}
              <div className="text-[rgb(var(--muted))] text-sm whitespace-nowrap shrink-0">
                共 {filteredCommentList.length} 条
              </div>
            </div>

            {/* 搜索和筛选区域：单独一行在移动端，确保不溢出 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 搜索框 */}
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="搜索..."
                  className="pl-8 pr-8 py-1.5 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all w-full text-sm"
                />
                {searchKeyword && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* 博客筛选：使用原生select组件 */}
              <div className="relative min-w-[160px] sm:min-w-[200px]">
                <select
                  value={selectedBlog}
                  onChange={e => setSelectedBlog(e.target.value)}
                  className="w-full appearance-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm rounded-lg py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                >
                  <option value="all">全部博客</option>
                  {blogOptions.map(blog => (
                    <option
                      key={blog.id}
                      value={blog.id.toString()}
                      className="bg-[rgb(var(--card))] text-[rgb(var(--text))]"
                    >
                      {blog.title}
                    </option>
                  ))}
                </select>
                {/* 自定义下拉箭头 */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[rgb(var(--muted))]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 评论列表内容 */}
          <div className="p-3 md:p-6 min-h-[90vh]">
            {loading ? (
              // 加载状态骨架屏
              <div className="space-y-3 h-[400px] flex flex-col justify-center">
                {[1, 2, 3, 4, 5].map(item => (
                  <div key={item} className="animate-pulse bg-[rgb(var(--muted))]/50 rounded-lg h-16"></div>
                ))}
              </div>
            ) : paginatedComments.length > 0 ? (
              <div className="">
                {paginatedComments.map(comment => (
                  <motion.div
                    key={comment.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className="bg-[rgb(var(--card))]/60 border-[rgb(var(--border))] rounded-lg p-3 hover:bg-[rgb(var(--hover))]/80 transition-all duration-300"
                  >
                    <div className="flex gap-3">
                      {/* 头像 */}
                      <div className="shrink-0">
                        <Image
                          src={comment.avatar || ASSETS.DEFAULT_AVATAR}
                          alt={comment.nickname}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover border-[rgb(var(--border))]"
                        />
                      </div>

                      {/* 评论内容 */}
                      <div className="flex-1 min-w-0">
                        {/* 评论头部信息 */}
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-[rgb(var(--text))] text-sm">
                              {comment.nickname}
                            </span>
                            <span className="text-xs text-[rgb(var(--muted))]">
                              {formatDate(comment.createTime)}
                            </span>
                          </div>

                          {/* 删除按钮 */}
                          <button
                            onClick={() => deleteCommentById(comment.id)}
                            className="text-red-600 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors text-xs flex items-center gap-1 ml-2"
                          >
                            <Delete className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>

                        {/* 博客信息 */}
                        <div className="text-xs text-[rgb(var(--muted))] mb-1 flex items-center">
                          <span>回复了</span>
                          <Link
                            href={`/blogInfo?id=${comment.blog.id}`}
                            className="text-[rgb(var(--primary))] hover:underline ml-1 max-w-[200px] truncate"
                          >
                            {comment.blog.title}
                          </Link>
                        </div>

                        {/* 评论内容 */}
                        <p className="text-[rgb(var(--text))] text-sm mb-1 break-words">{comment.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              // 空状态
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-4">
                <div className="text-[rgb(var(--muted))] mb-4">
                  <AlertCircle className="h-12 mx-auto" />
                </div>
                <p className="text-[rgb(var(--muted))]">
                  {searchKeyword || selectedBlog !== 'all' ? '未找到匹配的评论' : '暂无评论数据'}
                </p>
                {(searchKeyword || selectedBlog !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchKeyword('')
                      setSelectedBlog('all')
                    }}
                    className="mt-4 px-4 py-2 rounded-lg bg-[rgb(var(--hover))] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))] transition-colors text-sm"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            )}

            {/* 分页组件 */}
            {filteredCommentList.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-[rgb(var(--border))] pt-3">
                <div className="text-sm text-[rgb(var(--muted))]">
                  显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCommentList.length)} 条，共 {filteredCommentList.length} 条
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                          <span className="px-1 text-[rgb(var(--muted))]">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1 rounded-md text-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgb(var(--hover))] transition-colors"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay))] backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))] rounded-xl border-[rgb(var(--border))] w-full max-w-md p-5"
            >
              <h3 className="text-base font-semibold text-[rgb(var(--primary))] mb-3 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-400" />
                确认删除
              </h3>
              <p className="text-[rgb(var(--text))] mb-5 text-sm">此操作将永久删除该评论，是否继续？</p>
              <div className="flex justify-end gap-3">
                <motion.button
                  onClick={() => setDeleteConfirm(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2.5 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2.5 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-2 text-sm"
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