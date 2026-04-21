'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  Clock,
  Globe,
  GlobeLock,
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'
import React from 'react'

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
  published: boolean
  createTime: string
  updateTime: string
}

interface FetchResult {
  flag: boolean
  code: number
  message: string
  data: DocItem[] | DocItem | null
}

// ============ 树形结构（用于文件夹导航） ============

interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  doc?: DocItem
  children: TreeNode[]
  fileCount: number
}

function getDocFullPath(doc: DocItem): string {
  const ns = doc.docNamespace || 'blog/docs'
  const folderPath = ns.replace(/^blog\/docs\/?/, '')
  return folderPath ? `${folderPath}/${doc.filename}` : doc.filename
}

function buildTree(docs: DocItem[]): TreeNode {
  const root: TreeNode = {
    name: '全部文档',
    path: '',
    isFolder: true,
    children: [],
    fileCount: 0,
  }

  for (const doc of docs) {
    const fullPath = getDocFullPath(doc)
    const parts = fullPath.split('/')
    let current = root

    for (let i = 0; i < parts.length - 1; i++) {
      const fn = parts[i]
      const fp = parts.slice(0, i + 1).join('/')
      let child = current.children.find((c) => c.isFolder && c.name === fn)
      if (!child) {
        child = {
          name: fn,
          path: fp,
          isFolder: true,
          children: [],
          fileCount: 0,
        }
        current.children.push(child)
      }
      current = child
    }

    current.children.push({
      name: parts[parts.length - 1],
      path: fullPath,
      isFolder: false,
      doc,
      children: [],
      fileCount: 0,
    })
  }

  function compute(n: TreeNode) {
    let f = 0
    for (const c of n.children) {
      if (c.isFolder) {
        compute(c)
        f += c.fileCount
      } else {
        f++
      }
    }
    n.fileCount = f
  }
  compute(root)

  function sort(n: TreeNode) {
    n.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.filter((c) => c.isFolder).forEach(sort)
  }
  sort(root)

  return root
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
  const [showCreateDirModal, setShowCreateDirModal] = useState(false)

  // 表单状态
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null)
  const [newDirName, setNewDirName] = useState('')
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

  // 文件夹路径状态
  const [currentDir, setCurrentDir] = useState('')

  // 文件系统当前目录下的项目（用于显示空目录）
  interface FsItem {
    name: string
    isDirectory: boolean
    size: number
    mtime: string
    birthtime: string
  }
  const [fsItems, setFsItems] = useState<FsItem[]>([])

  // 树形结构
  const tree = useMemo(() => buildTree(docs), [docs])

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

  const fetchFsItems = useCallback(async (dir?: string) => {
    try {
      const targetDir = dir !== undefined ? dir : currentDir
      const ns = targetDir ? `blog/docs/${targetDir}` : 'blog/docs'
      const res = await apiClient({
        url: ENDPOINTS.FILE.GET_FILES,
        method: 'GET',
        params: { namespace: ns }
      })
      const result = res.data as { code: number; items?: FsItem[] }
      if (result.code === 200 && Array.isArray(result.items)) {
        setFsItems(result.items)
      } else {
        setFsItems([])
      }
    } catch {
      setFsItems([])
    }
  }, [currentDir])

  useEffect(() => {
    fetchFsItems()
  }, [fetchFsItems])

  // 过滤和排序（全局搜索用）
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

  // 当前文件夹下的子目录和文件（以文件系统 API 为准）
  const subFolders = fsItems
    .filter(i => i.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name))

  interface FileWithDoc {
    fsItem: FsItem
    doc: DocItem | null
  }
  const filesWithDoc: FileWithDoc[] = fsItems
    .filter(i => !i.isDirectory)
    .map(fsItem => {
      const expectedPath = currentDir ? `${currentDir}/${fsItem.name}` : fsItem.name
      const doc = docs.find(d => getDocFullPath(d) === expectedPath) || null
      return { fsItem, doc }
    })
    .sort((a, b) => {
      if (sortBy === 'viewCount') {
        return ((b.doc?.viewCount || 0) - (a.doc?.viewCount || 0))
      }
      return a.fsItem.name.localeCompare(b.fsItem.name)
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
      const uploadNamespace = currentDir ? `blog/docs/${currentDir}` : 'blog/docs'
      formData.append('namespace', uploadNamespace)
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
            docNamespace: uploadNamespace,
            published: true
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

  // 切换发布状态
  const togglePublished = async (doc: DocItem) => {
    try {
      const result = await fetchData(ENDPOINTS.ADMIN.DOC_PUBLISHED, 'POST', {
        docId: doc.id,
        published: !doc.published
      })
      if (result.flag) {
        showAlert(doc.published ? '已取消发布' : '已发布')
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

  // 创建目录
  const handleCreateDirectory = async () => {
    if (!newDirName.trim()) {
      setError('目录名称不能为空')
      return
    }

    try {
      setLoading(true)
      const parentNs = currentDir ? `blog/docs/${currentDir}` : 'blog/docs'
      const data = await fetchData(ENDPOINTS.FILE.DIRECTORY, 'POST', {
        name: newDirName,
        parentNamespace: parentNs
      })

      if (data.code === 200) {
        setShowCreateDirModal(false)
        setNewDirName('')
        setError(null)
        fetchFsItems()
        showAlert('目录创建成功')
      } else {
        throw new Error(data.message || '创建目录失败')
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '创建目录失败')
    } finally {
      setLoading(false)
    }
  }

  // 从树中收集所有文件夹路径（用于上传时选择目标文件夹）
  const allFolders = useMemo(() => {
    const folders: string[] = []
    function walk(node: TreeNode) {
      for (const c of node.children) {
        if (c.isFolder) {
          folders.push(c.path)
          walk(c)
        }
      }
    }
    walk(tree)
    return folders
  }, [tree])

  // 进入文件夹
  const handleEnterFolder = (folderPath: string) => {
    setLoading(true)
    setCurrentDir(folderPath)
  }

  // 返回上级文件夹
  const handleGoBack = () => {
    if (!currentDir) return
    setLoading(true)
    const parts = currentDir.split('/')
    parts.pop()
    setCurrentDir(parts.join('/'))
  }

  // 面包屑导航
  const folderBreadcrumbs = currentDir ? currentDir.split('/') : []

  // 渲染面包屑
  const renderBreadcrumbs = () => {
    if (!currentDir) {
      return (
        <button
          onClick={() => { setLoading(true); setCurrentDir('') }}
          className="flex items-center gap-1 text-[rgb(var(--primary))] font-medium"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          全部文档
        </button>
      )
    }

    return (
      <>
        <button
          onClick={() => { setLoading(true); setCurrentDir('') }}
          className="flex items-center gap-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          全部文档
        </button>
        {folderBreadcrumbs.map((folder, idx) => {
          const path = folderBreadcrumbs.slice(0, idx + 1).join('/')
          const isLast = idx === folderBreadcrumbs.length - 1
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-[rgb(var(--text-muted))]" />
              <button
                onClick={() => { setLoading(true); setCurrentDir(path) }}
                className={`hover:text-[rgb(var(--text))] ${isLast ? 'text-[rgb(var(--text))] font-medium' : 'text-[rgb(var(--text-muted))]'}`}
              >
                {folder}
              </button>
            </React.Fragment>
          )
        })}
      </>
    )
  }

  // 判断列表是否为空
  const isEmpty = subFolders.length === 0 && filesWithDoc.length === 0

  return (
    <div className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden">
      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm lg:rounded-xl shadow border border-slate-200/50 overflow-hidden" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
          {/* 顶部导航 */}
          <div className="px-4 py-3 border-b border-slate-200/50" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--muted))' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800 truncate flex items-center gap-2">
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
                {/* 新建目录 */}
                <button
                  onClick={() => { setShowCreateDirModal(true); setNewDirName(''); setError(null); }}
                  className="inline-flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-colors text-sm"
                  disabled={loading}
                >
                  <Folder className="h-4 w-4 mr-1" />
                  新建目录
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

          {/* 主内容区 */}
          <div className="px-4 pb-4 min-h-[80vh]">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-100/60 border border-red-200/50 text-red-700 px-4 py-2 rounded-lg mb-3 flex items-center mt-3">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* 面包屑导航 */}
            {!searchQuery && (
              <div className="mb-1 mt-3 px-2 flex sm:text-base items-center text-xs overflow-x-auto pb-1 hide-scrollbar">
                <div className="flex items-center whitespace-nowrap">
                  {renderBreadcrumbs()}
                  {currentDir && (
                    <button
                      onClick={handleGoBack}
                      className="ml-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] flex items-center transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      返回
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 文件列表 */}
            {loading ? (
              <div className="bg-white/60 rounded-lg shadow overflow-hidden border border-slate-200/50 mt-3" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                <div className="px-4 py-2 text-center text-slate-500" style={{ color: 'rgb(var(--text-muted))' }}>
                  <Loader2 className="animate-spin h-5 w-5 mx-auto mb-2 text-slate-600" />
                  加载中...
                </div>
              </div>
            ) : searchQuery ? (
              // 搜索模式：显示全局搜索结果
              filteredDocs.length === 0 ? (
                <div className="bg-white/60 rounded-lg shadow overflow-hidden border border-slate-200/50 mt-3" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                  <div className="p-4 text-center text-slate-500" style={{ color: 'rgb(var(--text-muted))' }}>
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    未找到匹配的文档
                  </div>
                </div>
              ) : (
                <div className="bg-white/60 rounded-lg shadow overflow-hidden border border-slate-200/50 mt-3" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
                      <thead className="bg-slate-100/60" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">文档</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">类型</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">访问量</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">推荐</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">发布</th>
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
                                type="button"
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
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => togglePublished(item)}
                                className="p-1 rounded-full transition-colors"
                                title={item.published ? '取消发布' : '发布'}
                              >
                                {item.published ? (
                                  <Globe className="w-4 h-4 text-green-500" />
                                ) : (
                                  <GlobeLock className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors mr-1"
                                title="编辑"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
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
                </div>
              )
            ) : isEmpty ? (
              <div className="bg-white/60 rounded-lg shadow overflow-hidden border border-slate-200/50 mt-3" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                <div className="p-4 text-center text-slate-500" style={{ color: 'rgb(var(--text-muted))' }}>
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  当前目录暂无文档
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-lg shadow overflow-hidden border border-slate-200/50 mt-3" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
                    <thead className="bg-slate-100/60" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">名称</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">类型</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">访问量</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">推荐</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider">发布</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50" style={{ borderColor: 'rgb(var(--border))' }}>
                      {/* 先显示子文件夹 */}
                      {subFolders.map(folder => {
                        const folderPath = currentDir ? `${currentDir}/${folder.name}` : folder.name
                        return (
                          <tr
                            key={folder.name}
                            className="hover:bg-[rgb(var(--hover))] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleEnterFolder(folderPath)}
                                className="flex items-center gap-2 text-left w-full"
                              >
                                <Folder className="w-4.5 h-4.5 text-yellow-500 shrink-0" />
                                <span className="text-blue-600 hover:text-blue-500 hover:underline font-medium">
                                  {folder.name}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-xs text-[rgb(var(--text-muted))]">文件夹</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-[rgb(var(--text-muted))]">-</span>
                            </td>
                            <td className="px-4 py-3 text-center">-</td>
                            <td className="px-4 py-3 text-center">-</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleEnterFolder(folderPath)}
                                className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {/* 再显示文档（以文件系统为准，包含未注册的文件） */}
                      {filesWithDoc.map(({ fsItem, doc }) => {
                        const ext = fsItem.name.slice(fsItem.name.lastIndexOf('.')).toLowerCase()
                        return (
                          <tr key={fsItem.name} className="hover:bg-[rgb(var(--hover))] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className={`w-4 h-4 shrink-0 ${getTypeColor(ext)}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{doc?.title || fsItem.name}</p>
                                  <p className="text-xs text-[rgb(var(--text-muted))] truncate hidden md:block">{doc?.description || '无描述'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className={`text-xs font-mono ${getTypeColor(ext)}`}>{ext}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-[rgb(var(--text-muted))]">{doc?.viewCount || 0}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {doc ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRecommend(doc)}
                                  className="p-1 rounded-full transition-colors"
                                  title={doc.recommend ? '取消推荐' : '设为推荐'}
                                >
                                  {doc.recommend ? (
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-[rgb(var(--text-muted))]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {doc ? (
                                <button
                                  type="button"
                                  onClick={() => togglePublished(doc)}
                                  className="p-1 rounded-full transition-colors"
                                  title={doc.published ? '取消发布' : '发布'}
                                >
                                  {doc.published ? (
                                    <Globe className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <GlobeLock className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-[rgb(var(--text-muted))]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {doc ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(doc)}
                                    className="p-1.5 rounded-full bg-blue-100/60 text-blue-600 hover:bg-blue-100/80 transition-colors mr-1"
                                    title="编辑"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(doc)}
                                    className="p-1.5 rounded-full bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-[rgb(var(--text-muted))]">未注册</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
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
              {/* 目标文件夹选择 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">目标文件夹</label>
                <div className="flex gap-2">
                  <select
                    value={currentDir}
                    onChange={e => setCurrentDir(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[rgb(var(--border))] bg-[rgb(var(--bg))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] text-sm"
                    disabled={batchUploading}
                  >
                    <option value="">根目录 (blog/docs)</option>
                    {allFolders.map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                  </select>
                  {currentDir && (
                    <button
                      type="button"
                      onClick={() => setCurrentDir('')}
                      className="px-2 py-2 text-xs border border-[rgb(var(--border))] rounded-lg hover:bg-[rgb(var(--hover))] text-[rgb(var(--text-muted))]"
                      title="返回根目录"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">
                  文件将上传到: {currentDir ? `blog/docs/${currentDir}` : 'blog/docs'}
                </p>
              </div>

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

      {/* 创建目录模态框 */}
      {showCreateDirModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <ModalOverlay onClick={() => setShowCreateDirModal(false)} />
          <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl shadow-2xl border border-[rgb(var(--border))] w-full max-w-md">
            <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-yellow-500" />
                创建新目录
              </h3>
              <button onClick={() => { setShowCreateDirModal(false); setNewDirName(''); setError(null); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-xs font-medium mb-1">目录名称</label>
              <input
                type="text"
                value={newDirName}
                onChange={e => setNewDirName(e.target.value)}
                className="w-full px-3 py-2 border border-[rgb(var(--border))] bg-[rgb(var(--bg))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))] text-sm"
                placeholder="请输入目录名称"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreateDirectory() }}
              />
              {error && (
                <p className="text-red-600 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  {error}
                </p>
              )}
              <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">
                将在: {currentDir ? `blog/docs/${currentDir}/${newDirName || '...'}` : `blog/docs/${newDirName || '...'}`} 创建
              </p>
            </div>
            <div className="p-3 border-t border-[rgb(var(--border))] flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateDirModal(false); setNewDirName(''); setError(null); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200/60 hover:bg-slate-200 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateDirectory}
                disabled={!newDirName.trim() || loading}
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:opacity-90 text-white text-sm disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
