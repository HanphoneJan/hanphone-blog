'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeProvider'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import Image from 'next/image'
import Compressor from 'compressorjs' // 引入compressor.js
import { ENDPOINTS } from '@/lib/api'
import { ADMIN_BLOG_INPUT_LABELS } from '@/lib/labels'
import apiClient from '@/lib/utils'
import { showAlert } from '@/lib/Alert'
import { STORAGE_KEYS } from '@/lib/constants'
import ModalOverlay from '@/components/shared/ModalOverlay'
// 引入 lucide 图标
import {
  FileText,
  Upload,
  Check,
  X,
  Save,
  ChevronRight,
  Tag,
  Type,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  RotateCcw, // 重置图标
  Send
} from 'lucide-react'

interface UserInfo {
  avatar?: string
  nickname?: string
  username?: string
  type?: string
  id?: number | null
  email?: string
  loginProvince?: string
  loginCity?: string
}

interface Blog {
  id: number | null
  content: string
  flag: string
  title: string
  type: TypeItem | null
  tagIds: string
  firstPicture: string
  appreciation: number
  user: UserInfo
  views: number
  commentabled: boolean
  description: string
}

interface TypeItem {
  id: number
  name: string
}

interface TagItem {
  id: number
  name: string
}

interface FlagItem {
  value: string
  label: string
}

// localStorage 键名
const BLOG_DRAFT_KEY = 'blog_draft_data'

export default function BlogEditorPage() {
  const router = useRouter()
  const uploadRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { theme } = useTheme() // 使用 useTheme hook 获取当前主题

  const [blog, setBlog] = useState<Blog>({
    id: null,
    content: '',
    flag: '原创',
    title: '',
    type: null,
    tagIds: '',
    firstPicture: '',
    appreciation: 0,
    user: {},
    views: 0,
    commentabled: true,
    description: ''
  })

  const [dialogImageUrl, setDialogImageUrl] = useState<string>('')
  const [publishModalVisible, setPublishModalVisible] = useState<boolean>(false)
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false)
  const [typeList, setTypeList] = useState<TypeItem[]>([])
  const [tagList, setTagList] = useState<TagItem[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light') // MDEditor的专用主题状态

  const flags: FlagItem[] = [
    { value: '原创', label: '原创' },
    { value: '转载', label: '转载' },
    { value: '翻译', label: '翻译' }
  ]
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 初始化检测
    const checkIsMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768) // 768px以下视为移动端
      }
    }

    checkIsMobile() // 初始检查
    window.addEventListener('resize', checkIsMobile) // 监听窗口大小变化

    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  // 根据当前主题设置 MDEditor 的显示模式
  useEffect(() => {
    // dark 和 cyber 主题使用 dark 模式，light 和 macaron 使用 light 模式
    const isDarkTheme = theme === 'dark' || theme === 'cyber'
    setEditorTheme(isDarkTheme ? 'dark' : 'light')
  }, [theme])

  // 保存草稿到localStorage
  const saveDraftToLocalStorage = () => {
    const draftData = {
      blog,
      selectedTags,
      selectedTypeId,
      dialogImageUrl
    }
    localStorage.setItem(BLOG_DRAFT_KEY, JSON.stringify(draftData))
  }

  // 从localStorage加载草稿
  const loadDraftFromLocalStorage = () => {
    try {
      const draftJson = localStorage.getItem(BLOG_DRAFT_KEY)
      if (draftJson) {
        const draftData = JSON.parse(draftJson)
        setBlog(draftData.blog)
        setSelectedTags(draftData.selectedTags || [])
        setSelectedTypeId(draftData.selectedTypeId || null)
        setDialogImageUrl(draftData.dialogImageUrl || '')
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error)
    }
  }

  // 重置草稿
  const resetDraft = () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    const userInfo = user ? JSON.parse(user) : {}

    setBlog({
      id: null,
      content: '',
      flag: '原创',
      title: '',
      type: null,
      tagIds: '',
      firstPicture: '',
      appreciation: 0,
      user: userInfo,
      views: 0,
      commentabled: true,
      description: ''
    })
    setSelectedTags([])
    setSelectedTypeId(null)
    setDialogImageUrl('')
    setFormErrors({})

    // 清除localStorage中的草稿
    localStorage.removeItem(BLOG_DRAFT_KEY)

    showAlert(ADMIN_BLOG_INPUT_LABELS.RESET_SUCCESS)
  }

  // 设置定时保存
  useEffect(() => {
    // 每30秒自动保存一次
    const interval = setInterval(() => {
      saveDraftToLocalStorage()
    }, 30000)

    return () => {
      clearInterval(interval)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [blog, selectedTags, selectedTypeId, dialogImageUrl])

  // 内容变化时延迟保存
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // 延迟1秒保存，避免频繁写入
    saveTimerRef.current = setTimeout(() => {
      saveDraftToLocalStorage()
    }, 1000)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [blog, selectedTags, selectedTypeId, dialogImageUrl])

  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      setLoading(true)
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })

      setLoading(false)
      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      setLoading(false)
      return { code: 500, data: [] }
    }
  }

  useEffect(() => {
    // 从localStorage加载草稿
    loadDraftFromLocalStorage()

    const user = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (user) {
      setBlog(prev => ({ ...prev, user: JSON.parse(user) }))
    }

    getTypeList()
    getTagList()
  }, [router])

  const getTypeList = async () => {
    try {
      const data = await fetchData(ENDPOINTS.ADMIN.FULL_TYPE_LIST)
      if (data.code === 200) {
        setTypeList(data.data)
      } else {
        showAlert(ADMIN_BLOG_INPUT_LABELS.FETCH_TYPE_FAIL)
      }
    } catch (error) {
      console.log('Error fetching type list:', error)
    }
  }

  const getTagList = async () => {
    try {
      const data = await fetchData(ENDPOINTS.ADMIN.FULL_TAG_LIST)
      if (data.code === 200) {
        setTagList(data.data)
      } else {
        showAlert(ADMIN_BLOG_INPUT_LABELS.FETCH_TAG_FAIL)
      }
    } catch (error) {
      console.log('Error fetching tag list:', error)
    }
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!blog.title.trim()) {
      errors.title = '标题不能为空！'
    } else if (blog.title.length > 100) {
      errors.title = '标题不超过100字！'
    }

    if (!blog.content.trim()) {
      errors.content = '内容不能为空！'
    }

    if (!blog.description.trim()) {
      errors.description = '描述不能为空！'
    } else if (blog.description.length > 200) {
      errors.description = '描述不超过200字！'
    }

    if (!selectedTypeId) {
      errors.type = '请选择文章分类！'
    }

    // 标签改为可选，不再验证必填

    if (!blog.flag) {
      errors.flag = '请选择文章类型！'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveChanges = async () => {
    if (!validateForm()) return

    try {
      const updatedBlog = {
        ...blog,
        typeId: selectedTypeId,
        tagIds: selectedTags.length > 0 ? selectedTags.join(',') : '' // 未选择标签时传空字符串
      }

      const data = await fetchData(ENDPOINTS.BLOGS, 'POST', { blog: updatedBlog })

      if (data.code === 200) {
        // 保存成功后清除草稿
        localStorage.removeItem(BLOG_DRAFT_KEY)
        showAlert(ADMIN_BLOG_INPUT_LABELS.MODIFY_SUCCESS)
        router.back()
      } else {
        showAlert(ADMIN_BLOG_INPUT_LABELS.MODIFY_FAIL)
      }
    } catch (error) {
      console.error('Error updating blog:', error)
      showAlert(ADMIN_BLOG_INPUT_LABELS.MODIFY_FAIL)
    }
  }

  const openPublishDialog = () => {
    setPublishModalVisible(true)
  }

  // 修改文件上传处理逻辑，添加图片压缩
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    // 检查是否为图片文件
    if (!file.type.startsWith('image/')) {
      showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_REQUIRED)
      return
    }

    // 保存原始文件名（不含扩展名）和扩展名
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const fileExtension = 'jpeg' // 统一使用jpeg扩展名
    const newFileName = `${originalName}.${fileExtension}`

    try {
      setLoading(true)

      // 使用Compressor压缩图片
      new Compressor(file, {
        quality: 0.8, // 压缩质量，0-1之间
        maxWidth: 1200, // 最大宽度限制
        maxHeight: 1200, // 最大高度限制
        mimeType: 'image/jpeg', // 确保MIME类型正确
        convertSize: 102400, // 小于100KB的图片也进行转换
        success: async compressedResult => {
          try {
            // 将压缩后的blob转换为File对象，并保持原始文件名（修改扩展名为jpeg）
            const compressedFile = new File([compressedResult], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            const formData = new FormData()
            formData.append('namespace', 'blog/blogs')
            formData.append('file', compressedFile) // 使用带有原始文件名的压缩文件

            const response = await apiClient({
              url: ENDPOINTS.FILE.UPLOAD,
              method: 'POST',
              data: formData
            })

            const data = response.data

            if (data.url) {
              setDialogImageUrl(data.url)
              setBlog(prev => ({ ...prev, firstPicture: data.url }))
              showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_UPLOAD_SUCCESS)
            } else {
              showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_UPLOAD_FAIL)
            }
          } catch (error) {
            console.error('图片上传出错:', error)
            showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_UPLOAD_FAIL)
          } finally {
            setLoading(false)
            if (uploadRef.current) uploadRef.current.value = ''
          }
        },
        error: err => {
          console.error('图片压缩失败:', err)
          showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_COMPRESS_FAIL)
          setLoading(false)
          if (uploadRef.current) uploadRef.current.value = ''
        }
      })
    } catch (error) {
      setLoading(false)
      console.log('图片处理失败' + error)
      showAlert(ADMIN_BLOG_INPUT_LABELS.IMAGE_PROCESS_FAIL)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  const publishBlog = async () => {
    if (!validateForm()) return

    try {
      const newBlog = {
        ...blog,
        firstPicture: dialogImageUrl,
        tagIds: selectedTags.length > 0 ? selectedTags.join(',') : '', // 未选择标签时传空字符串
        typeId: selectedTypeId
      }

      const data = await fetchData(ENDPOINTS.ADMIN.BLOGS, 'POST', { blog: newBlog })

      if (data.code === 200) {
        // 发布成功后清除草稿
        localStorage.removeItem(BLOG_DRAFT_KEY)
        showAlert(ADMIN_BLOG_INPUT_LABELS.PUBLISH_SUCCESS)
        setPublishModalVisible(false)
        router.push('/admin/blogs')
      } else {
        showAlert(ADMIN_BLOG_INPUT_LABELS.PUBLISH_FAIL)
        setPublishModalVisible(false)
      }
    } catch (error) {
      console.error('Error publishing blog:', error)
      showAlert(ADMIN_BLOG_INPUT_LABELS.PUBLISH_ERROR)
    }
  }

  const handleRemoveImage = () => {
    setDialogImageUrl('')
    setBlog(prev => ({ ...prev, firstPicture: '' }))
    if (uploadRef.current) {
      uploadRef.current.value = ''
    }
  }

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const setBlogType = (typeId: number) => {
    setSelectedTypeId(typeId)
    const selectedType = typeList.find(item => item.id === typeId)
    if (selectedType) {
      setBlog(prev => ({ ...prev, type: selectedType }))
    }
  }

  const setBlogFlag = (flag: string) => {
    setBlog(prev => ({ ...prev, flag }))
  }

  return (
    <div className="font-sans min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-blue-50 text-slate-800 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgb(var(--bg)))', color: 'rgb(var(--text))' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(50,100,200,0.1)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(80,120,250,0.1)_0%,transparent_40%)] opacity-100"></div>
      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        <div className="flex flex-nowrap items-center mt-3 gap-3 mb-2">
          <div className="flex-1 min-w-0 ml-2">
            <input
              type="text"
              placeholder="请输入文章标题"
              value={blog.title}
              onChange={e => setBlog(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${
                formErrors.title ? 'border-red-500' : ''
              } bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all h-12`}
              style={{ borderColor: formErrors.title ? undefined : 'rgb(var(--border))' }}
            />
            {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
          </div>
          <div className="w-auto shrink-0 flex gap-2">
            {/* 重置按钮 */}
            <button
              onClick={resetDraft}
              disabled={loading}
              className={`px-4 py-3 rounded-md transition duration-300 bg-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))] text-[rgb(var(--text))] flex items-center gap-2 h-12 ${
                loading ? 'opacity-70' : ''
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">重置</span>
            </button>

            {blog.id ? (
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className={`px-4 py-3 rounded-md transition duration-300 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white flex items-center gap-1 h-12 ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  '保存中...'
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">保存修改</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={openPublishDialog}
                disabled={loading}
                className={`px-4 py-3 rounded-md transition duration-300 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white flex items-center gap-1 mr-1 lg:mr-0 h-12 ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                {loading ? (
                  '处理中...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">发布设置</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] lg:p-2 mb-6 transition-all duration-300">
          <div className={`mb-1 text-sm`} style={{ color: 'rgb(var(--text-muted))' }}>
            {formErrors.content && <span className="text-red-500 ml-2">{formErrors.content}</span>}
          </div>
          <div className="border border-[rgb(var(--border))] rounded-lg bg-[rgb(var(--card))] overflow-hidden">
            <MDEditor
              value={blog.content}
              onChange={val => setBlog(prev => ({ ...prev, content: val || '' }))}
              height={600}
              className="text-[rgb(var(--text))] min-h-[100vh]"
              preview={isMobile ? 'edit' : 'live'}
              data-color-mode={editorTheme} // 使用动态状态
            />
          </div>
        </div>

        {publishModalVisible &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <ModalOverlay onClick={() => setPublishModalVisible(false)} />
              <div className="relative z-10 bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                <div className="px-5 py-3 border-b border-[rgb(var(--border))] flex justify-between items-center shrink-0" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                  <h3 className="text-lg font-semibold text-[rgb(var(--primary))] flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    发布文章
                  </h3>
                  <button
                    onClick={() => setPublishModalVisible(false)}
                    className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-5 py-4 overflow-y-auto flex-1">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-[rgb(var(--text))] mb-1 flex items-center">
                        <span className="bg-teal-600/20 p-1 rounded mr-2">
                          <Info className="h-4 w-4 text-teal-600" />
                        </span>
                        文章描述
                      </label>
                      <textarea
                        placeholder="请输入文章描述（用于展示在文章列表，不超过200字）"
                        value={blog.description}
                        onChange={e => setBlog(prev => ({ ...prev, description: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          formErrors.description ? 'border-red-500' : ''
                        } bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all min-h-[80px] resize-y`}
                        maxLength={200}
                        style={{ borderColor: formErrors.description ? undefined : 'rgb(var(--border))' }}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {formErrors.description && (
                          <p className="text-red-500 text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {formErrors.description}
                          </p>
                        )}
                        <p className="text-[rgb(var(--text-muted))] text-sm ml-auto" style={{ color: 'rgb(var(--text-muted))' }}>{blog.description.length}/200</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[rgb(var(--text))] mb-2 flex items-center">
                        <span className="bg-blue-600/20 p-1 rounded mr-2">
                          <ChevronRight className="h-4 w-4 text-blue-600" />
                        </span>
                        文章分类
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {typeList.length > 0 ? (
                          typeList.map(type => (
                            <button
                              key={type.id}
                              onClick={() => setBlogType(type.id)}
                              className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                                selectedTypeId === type.id
                                  ? 'bg-[rgb(var(--primary))] text-white shadow-lg'
                                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                              }`}
                            >
                              {selectedTypeId === type.id && <Check className="h-4 w-4" />}
                              {type.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-[rgb(var(--text-muted))] text-sm py-2 px-4 bg-[rgb(var(--muted))] rounded-lg">
                            暂无分类，请请联系管理员添加
                          </p>
                        )}
                      </div>
                      {formErrors.type && (
                        <p className="text-red-500 text-sm mt-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.type}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-[rgb(var(--text))] mb-2 flex items-center">
                        <span className="bg-purple-600/20 p-1 rounded mr-2">
                          <Tag className="h-4 w-4 text-purple-600" />
                        </span>
                        文章标签
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-[rgb(var(--muted))] rounded-lg border border-[rgb(var(--border))]">
                        {tagList.length > 0 ? (
                          tagList.map(tag => (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.id)}
                              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                                selectedTags.includes(tag.id)
                                  ? 'bg-purple-600 text-white shadow-lg'
                                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                              }`}
                            >
                              {selectedTags.includes(tag.id) && <Check className="h-4 w-4" />}
                              {tag.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-[rgb(var(--text-muted))] text-sm py-2 px-4 bg-[rgb(var(--muted))] rounded-lg">
                            暂无标签，请联系管理员添加
                          </p>
                        )}
                      </div>
                      {formErrors.tags && (
                        <p className="text-red-500 text-sm mt-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.tags}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-[rgb(var(--text))] mb-2 flex items-center">
                        <span className="bg-amber-600/20 p-1 rounded mr-2">
                          <Type className="h-4 w-4 text-amber-600" />
                        </span>
                        文章类型
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {flags.map(flag => (
                          <button
                            key={flag.value}
                            onClick={() => setBlogFlag(flag.value)}
                            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                              blog.flag === flag.value
                                ? 'bg-amber-600 text-white shadow-lg'
                                : 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                            }`}
                          >
                            {blog.flag === flag.value && <Check className="h-4 w-4" />}
                            {flag.label}
                          </button>
                        ))}
                      </div>
                      {formErrors.flag && (
                        <p className="text-red-500 text-sm mt-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.flag}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-[rgb(var(--text))] mb-2 flex items-center">
                        <span className="bg-rose-600/20 p-1 rounded mr-2">
                          <ImageIcon className="h-4 w-4 text-rose-600" />
                        </span>
                        文章首图
                      </label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div
                          className="w-full sm:w-40 h-40 rounded-lg border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center bg-[rgb(var(--muted))] cursor-pointer hover:border-[rgb(var(--primary))] transition-all duration-300 group relative overflow-hidden"
                          onClick={() => uploadRef.current?.click()}
                        >
                          {dialogImageUrl ? (
                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                              <Image
                                src={dialogImageUrl}
                                alt="博客首图"
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">更换图片</span>
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  handleRemoveImage()
                                }}
                                className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors duration-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center group-hover:scale-105 transition-transform duration-300">
                              <Upload className="h-8 w-8 text-[rgb(var(--text-muted))] mx-auto mb-2 group-hover:text-[rgb(var(--primary))] transition-colors" />
                              <p className="text-sm text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text))] transition-colors">
                                点击上传
                              </p>
                              <p className="text-xs text-[rgb(var(--text-muted))] mt-1">JPG, PNG</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={uploadRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="flex-1 text-sm text-[rgb(var(--text))] bg-[rgb(var(--muted))] p-4 rounded-lg">
                          <p className="font-medium text-[rgb(var(--text))] mb-2">图片要求：</p>
                          <ul className="space-y-1">
                            <li className="flex items-start">
                              <span className="text-green-600 mr-2">•</span>
                              建议尺寸为1200×630像素
                            </li>
                            <li className="flex items-start">
                              <span className="text-green-600 mr-2">•</span>
                              支持JPG、PNG格式（自动转为JPG）
                            </li>
                            <li className="flex items-start">
                              <span className="text-green-600 mr-2">•</span>
                              文件大小不超过5MB
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[rgb(var(--border))] flex justify-end gap-3 shrink-0" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                  <button
                    onClick={() => setPublishModalVisible(false)}
                    className="px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={publishBlog}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
                      loading
                        ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                        : 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>发布中...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>发布文章</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {previewModalVisible &&
          dialogImageUrl &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 flex items-center justify-center z-52 p-4">
              <ModalOverlay onClick={() => setPreviewModalVisible(false)} />
              <div className="relative z-10 max-w-4xl w-full animate-in fade-in zoom-in duration-200">
                <button
                  onClick={() => setPreviewModalVisible(false)}
                  className="absolute -top-12 right-0 text-white hover:text-[rgb(var(--text-muted))] transition-colors bg-black/50 p-2 rounded-full hover:bg-black/70"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="rounded-xl overflow-hidden shadow-2xl bg-[rgb(var(--card))]">
                  <Image
                    src={dialogImageUrl}
                    alt="预览图片"
                    width={320}
                    height={320}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
      </main>
    </div>
  )
}