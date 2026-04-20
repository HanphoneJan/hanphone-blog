'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import ModalOverlay from '@/components/shared/ModalOverlay'
import { COMMON_LABELS } from '@/lib/labels'
import {
  FileText,
  Trash2,
  Upload,
  Plus,
  Eye,
  Star,
  StarOff,
  X,
  Loader2,
  AlertCircle,
  BookOpen,
  Search,
  ArrowUpDown,
  CheckCircle,
  File,
  XCircle,
  Clock
} from 'lucide-react'

interface DocItem {
  id: number
  docId: string
  title: string
  description: string
  filename: string
  fileType: string
  docNamespace: string
  viewCount: number
  recommend: boolean
  createTime: string
  updateTime: string
}

interface FetchResult {
  flag: boolean
  code: number
  message: string
  data: DocItem[] | DocItem | null
}

const fetchData = async (url: string, method: string = 'GET', data?: unknown): Promise<FetchResult> => {
  try {
    const response = await apiClient({
      url,
      method,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined
    })
    return response.data as FetchResult
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    return { flag: false, code: 500, message: COMMON_LABELS.OPERATION_FAIL, data: null }
  }
}

export default function DocManagementPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'createTime' | 'viewCount'>('createTime')

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [currentDeleteItem, setCurrentDeleteItem] = useState<DocItem | null>(null)

  // 表单状态
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  // 批量上传状态
  type UploadStatus = 'pending' | 'uploading' | 'saving' | 'success' | 'failed'
  interface UploadFile {
    id: string
    file: File
    title: string
    description: string
    status: UploadStatus
    error?: string
  }
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([])
  const [batchUploading, setBatchUploading] = useState(false)

  // 获取文档列表
  const fetchDocs = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchData(ENDPOINTS.ADMIN.DOCS)
      if (result.flag && Array.isArray(result.data)) {
        setDocs(result.data)
      } else {
        throw new Error(result.message || '获取文档列表失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取文档列表时发生错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  // 过滤和排序
  const filteredDocs = docs
    .filter(d =>
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'viewCount') {
        return (b.viewCount || 0) - (a.viewCount || 0)
      }
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    })

  // 文件选择处理：构建上传队列
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validTypes = ['.docx', '.md', '.html', '.pdf']
    const newQueue: UploadFile[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!validTypes.includes(ext)) continue

      newQueue.push({
        id: `uf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        status: 'pending',
      })
    }

    if (newQueue.length === 0) {
      showAlert('仅支持上传 .docx, .md, .html, .pdf 格式的文档')
      return
    }

    setUploadQueue(newQueue)
  }

  // 更新队列中某个文件的状态
  const updateFileStatus = (id: string, status: UploadStatus, error?: string) => {
    setUploadQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status, error } : item
    ))
  }

  // 批量上传
  const handleBatchUpload = async () => {
    if (uploadQueue.length === 0) return

    const pendingFiles = uploadQueue.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setBatchUploading(true)

    try {
      // 1. 批量上传到 admin-file
      const formData = new FormData()
      formData.append('namespace', 'blog/docs')
      for (const item of pendingFiles) {
        formData.append('files', item.file)
      }

      setUploadQueue(prev => prev.map(item =>
        item.status === 'pending' ? { ...item, status: 'uploading' } : item
      ))

      const res = await apiClient({
        url: ENDPOINTS.FILE.UPLOAD_BATCH,
        method: 'POST',
        data: formData
      })

      if (res.data.code !== 200) {
        throw new Error(res.data.error || '批量上传失败')
      }

      const results = res.data.results as Array<{
        success: boolean
        filename: string
        originalName: string
        error?: string
      }>

      // 2. 逐条保存到主后端
      let successCount = 0
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const queueItem = pendingFiles[i]

        if (!result.success) {
          updateFileStatus(queueItem.id, 'failed', result.error || '上传失败')
          continue
        }

        updateFileStatus(queueItem.id, 'saving')

        const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        const ext = queueItem.file.name.slice(queueItem.file.name.lastIndexOf('.')).toLowerCase()

        const saveResult = await fetchData(ENDPOINTS.ADMIN.DOC, 'POST', {
          doc: {
            docId,
            title: queueItem.title || queueItem.file.name.replace(/\.[^.]+$/, ''),
            description: queueItem.description || '',
            filename: result.filename,
            fileType: ext,
            docNamespace: 'blog/docs'
          }
        })

        if (saveResult.flag) {
          updateFileStatus(queueItem.id, 'success')
          successCount++
        } else {
          updateFileStatus(queueItem.id, 'failed', saveResult.message || '保存文档信息失败')
        }
      }

      if (successCount > 0) {
        showAlert(`成功上传 ${successCount} 个文档`)
        fetchDocs()
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '批量上传失败')
      // 标记所有 pending/uploading 为失败
      setUploadQueue(prev => prev.map(item =>
        item.status === 'pending' || item.status === 'uploading' || item.status === 'saving'
          ? { ...item, status: 'failed', error: '批量上传失败' }
          : item
      ))
    } finally {
      setBatchUploading(false)
    }
  }

  // 从队列中移除某个文件
  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id))
  }

  // 更新队列中文件的标题
  const updateFileTitle = (id: string, title: string) => {
    setUploadQueue(prev => prev.map(item =>
      item.id === id ? { ...item, title } : item
    ))
  }

  // 编辑文档
  const handleEdit = async () => {
    if (!editingDoc) return
    if (!formTitle.trim()) {
      setError('文档标题不能为空')
      return
    }

    try {
      setLoading(true)
      const result = await fetchData(ENDPOINTS.ADMIN.DOC, 'POST', {
        doc: {
          id: editingDoc.id,
          title: formTitle,
          description: formDescription,
          filename: editingDoc.filename,
          fileType: editingDoc.fileType,
          docNamespace: editingDoc.docNamespace
        }
      })

      if (result.flag) {
        showAlert('更新成功')
        setShowEditModal(false)
        setEditingDoc(null)
        setFormTitle('')
        setFormDescription('')
        fetchDocs()
      } else {
        showAlert(result.message || '更新失败')
      }
    } catch (err) {
      showAlert('更新失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除
  const openDeleteModal = (item: DocItem) => {
    setCurrentDeleteItem(item)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!currentDeleteItem) return
    try {
      setLoading(true)
      // 先删除主后端记录
      const result = await fetchData(
        `${ENDPOINTS.ADMIN.DOC}/${currentDeleteItem.id}`,
        'DELETE'
      )
      if (result.flag) {
        showAlert('删除成功')
        fetchDocs()
      } else {
        showAlert(result.message || '删除失败')
      }
    } catch (err) {
      showAlert('删除失败')
    } finally {
      setLoading(false)
      setDeleteModalVisible(false)
      setCurrentDeleteItem(null)
    }
  }

  // 切换推荐
  const toggleRecommend = async (doc: DocItem) => {
    try {
      const result = await fetchData(ENDPOINTS.ADMIN.DOC_RECOMMEND, 'POST', {
        docId: doc.id,
        recommend: !doc.recommend
      })
      if (result.flag) {
        showAlert(doc.recommend ? '已取消推荐' : '已设为推荐')
        fetchDocs()
      } else {
        showAlert('操作失败')
      }
    } catch (err) {
      showAlert('操作失败')
    }
  }

  // 打开编辑
  const openEditModal = (doc: DocItem) => {
    setEditingDoc(doc)
    setFormTitle(doc.title)
    setFormDescription(doc.description || '')
    setShowEditModal(true)
  }

  // 文件类型图标颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case '.docx': return 'text-blue-500'
      case '.md': return 'text-emerald-500'
      case '.html': return 'text-amber-500'
      case '.pdf': return 'text-rose-500'
      default: return 'text-slate-400'
    }
  }

  // 上传状态图标
  const StatusIcon = ({ status }: { status: UploadStatus }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      case 'uploading':
      case 'saving':
        return <Loader2 className="w-4 h-4 text-[rgb(var(--primary))] animate-spin shrink-0" />
      default:
        return <Clock className="w-4 h-4 text-[rgb(var(--text-muted))] shrink-0" />
    }
  }

  const getStatusText = (status: UploadStatus) => {
    switch (status) {
      case 'pending': return '等待上传'
      case 'uploading': return '上传中...'
      case 'saving': return '保存中...'
      case 'success': return '上传成功'
      case 'failed': return '上传失败'
    }
  }

  // 关闭新增模态框时清理状态
  const closeAddModal = () => {
    setShowAddModal(false)
    setFormTitle('')
    setFormDescription('')
    setUploadQueue([])
    if (uploadRef.current) uploadRef.current.value = ''
  }

  return (
    <div className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden">
      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm lg:rounded-xl shadow border border-slate-200/50 overflow-hidden" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
          {/* 顶部 */}
          <div className="px-4 py-3 border-b border-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="text-lg font-bold truncate flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[rgb(var(--primary))]" />
                文档管理
              </h1>
              <div className="flex items-center gap-2">
                {/* 搜索 */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索文档..."
                    className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] w-40 sm:w-56"
                  />
                </div>
                {/* 排序 */}
                <button
                  onClick={() => setSortBy(prev => prev === 'createTime' ? 'viewCount' : 'createTime')}
                  className="p-1.5 rounded-lg border border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] transition-colors"
                  title={sortBy === 'createTime' ? '按访问量排序' : '按时间排序'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                {/* 新增 */}
                <button
                  onClick={() => { setShowAddModal(true); setUploadQueue([]); }}
                  className="inline-flex items-center px-3 py-1.5 bg-[rgb(var(--primary))] hover:opacity-90 text-white rounded-lg shadow transition-opacity text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新增文档
                </button>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-100/60 border border-red-200/50 text-red-700 px-4 py-2 rounded-lg m-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 文档列表 */}
          <div className="px-4 pb-4">
            {loading && docs.length === 0 ? (
              <div className="text-center py-12 text-[rgb(var(--text-muted))]">
                <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                加载中...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-[rgb(var(--text-muted))]">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{searchQuery ? '未找到匹配的文档' : '暂无文档'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
                  <thead className="bg-slate-100/60" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">文档</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">类型</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">访问量</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">推荐</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
                    {filteredDocs.map(item => (
                      <tr key={item.id} className="hover:bg-[rgb(var(--hover))] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 shrink-0 ${getTypeColor(item.fileType)}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-[rgb(var(--text-muted))] truncate hidden md:block">{item.description || '无描述'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-xs font-mono ${getTypeColor(item.fileType)}`}>{item.fileType}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-[rgb(var(--text-muted))]">{item.viewCount || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRecommend(item)}
                            className="p-1 rounded-full transition-colors"
                            title={item.recommend ? '取消推荐' : '设为推荐'}
                          >
                            {item.recommend ? (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors mr-1"
                            title="编辑"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 rounded-full bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 新增文档模态框（批量上传） */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <ModalOverlay onClick={closeAddModal} />
          <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl shadow-2xl border border-[rgb(var(--border))] w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center shrink-0">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-[rgb(var(--primary))]" />
                新增文档
                {uploadQueue.length > 0 && (
                  <span className="text-xs font-normal text-[rgb(var(--text-muted))]">
                    ({uploadQueue.filter(f => f.status === 'success').length}/{uploadQueue.length})
                  </span>
                )}
              </h3>
              <button onClick={closeAddModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {/* 文件选择区 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">选择文件（可多选）</label>
                <label className={`flex items-center justify-center w-full px-4 py-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  batchUploading ? 'opacity-50 pointer-events-none' : 'hover:border-[rgb(var(--primary))]'
                }`}
                  style={{ borderColor: 'rgb(var(--border))' }}
                >
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto mb-1.5 text-[rgb(var(--text-muted))]" />
                    <p className="text-sm text-[rgb(var(--text-muted))]">点击选择文档，支持多选</p>
                    <p className="text-xs text-[rgb(var(--text-muted))/0.7]">支持 .docx, .md, .html, .pdf，最多 20 个</p>
                  </div>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept=".docx,.md,.html,.pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={batchUploading}
                  />
                </label>
              </div>

              {/* 文件队列 */}
              {uploadQueue.length > 0 && (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {uploadQueue.map(item => {
                    const ext = item.file.name.slice(item.file.name.lastIndexOf('.')).toLowerCase()
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                          item.status === 'success' ? 'border-emerald-200/50 bg-emerald-50/30' :
                          item.status === 'failed' ? 'border-red-200/50 bg-red-50/30' :
                          'border-[rgb(var(--border))] bg-[rgb(var(--hover))]'
                        }`}
                      >
                        <File className={`w-4 h-4 shrink-0 ${getTypeColor(ext)}`} />
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => updateFileTitle(item.id, e.target.value)}
                            disabled={batchUploading || item.status !== 'pending'}
                            className="w-full bg-transparent text-sm truncate focus:outline-none focus:ring-0 border-none p-0"
                            title={item.file.name}
                          />
                          <p className="text-[10px] text-[rgb(var(--text-muted))]">
                            {item.file.name} · {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                          {item.error && (
                            <p className="text-[10px] text-red-500">{item.error}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[rgb(var(--text-muted))] whitespace-nowrap">
                          {getStatusText(item.status)}
                        </span>
                        <StatusIcon status={item.status} />
                        {item.status === 'pending' && !batchUploading && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-0.5 rounded hover:bg-[rgb(var(--hover))] text-[rgb(var(--text-muted))]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[rgb(var(--border))] flex justify-between items-center shrink-0">
              <span className="text-xs text-[rgb(var(--text-muted))]">
                {uploadQueue.length > 0 ? `已选择 ${uploadQueue.length} 个文件` : '未选择文件'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={closeAddModal}
                  className="px-3 py-1.5 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-sm"
                >
                  {uploadQueue.some(f => f.status === 'success') ? '完成' : '取消'}
                </button>
                {uploadQueue.some(f => f.status === 'pending') && (
                  <button
                    onClick={handleBatchUpload}
                    disabled={batchUploading}
                    className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:opacity-90 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {batchUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>上传</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 编辑模态框 */}
      {showEditModal && editingDoc && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <ModalOverlay onClick={() => setShowEditModal(false)} />
          <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl shadow-2xl border border-[rgb(var(--border))] w-full max-w-md">
            <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center">
              <h3 className="text-base font-semibold">编辑文档</h3>
              <button onClick={() => { setShowEditModal(false); setEditingDoc(null); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">文档标题</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgb(var(--border))] bg-[rgb(var(--bg))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">描述</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgb(var(--border))] bg-[rgb(var(--bg))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] text-sm resize-none"
                  rows={3}
                />
              </div>
              <div className="text-xs text-[rgb(var(--text-muted))]">
                <p>文件名: {editingDoc.filename}</p>
                <p>类型: {editingDoc.fileType}</p>
                <p>访问量: {editingDoc.viewCount || 0}</p>
              </div>
            </div>
            <div className="p-3 border-t border-[rgb(var(--border))] flex justify-end gap-2">
              <button
                onClick={() => { setShowEditModal(false); setEditingDoc(null); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:opacity-90 text-white text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 删除确认 */}
      {deleteModalVisible && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <ModalOverlay onClick={() => setDeleteModalVisible(false)} />
          <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl shadow-2xl border border-[rgb(var(--border))] w-full max-w-md">
            <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center">
              <h3 className="text-base font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" />
                确认删除
              </h3>
              <button onClick={() => setDeleteModalVisible(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm">
                确定要删除文档 <span className="font-medium">{currentDeleteItem?.title}</span> 吗？此操作不可撤销。
              </p>
            </div>
            <div className="p-3 border-t border-[rgb(var(--border))] flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalVisible(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
