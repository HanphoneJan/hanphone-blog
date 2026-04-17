'use client'

import Link from 'next/link'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Filter,
  X,
} from 'lucide-react'
import {
  API_PARAMS,
  ROUTES,
  PAGINATION,
  BLOG_LIST_CONFIG
} from '@/lib/constants'
import { BLOG_LABELS } from '@/lib/labels'
import { ENDPOINTS } from '@/lib/api'
import { FeaturedCard } from './components/FeaturedCard'
import { ArticleRow } from './components/ArticleRow'
import { TagCloud } from './components/TagCloud'

interface Tag {
  id: number
  name: string
  blogCount?: number
}

// 导出类型供子组件使用
export interface Blog {
  id: number
  title: string
  description: string
  firstPicture: string
  createTime: string
  views: number
  recommend: boolean
  type: {
    id: number
    name: string
  }
  user: {
    avatar: string
    nickname: string
  }
}

interface Type {
  id: number
  name: string
}

interface PageInfo {
  current: number
  size: number
  total: number
  totalPages: number
}

// 按分类分组的博客摘要（用于侧栏二级导航）
interface BlogsByType {
  [typeId: number]: { id: number; title: string }[]
}

interface BlogListClientProps {
  initialBlogs: Blog[]
  initialTypes: Type[]
  initialPageInfo: PageInfo
  initialTags?: Tag[]
}

export default function BlogListClient({
  initialBlogs,
  initialTypes,
  initialPageInfo,
  initialTags = []
}: BlogListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const [blogList, setBlogList] = useState<Blog[]>(initialBlogs)
  const [typeList, setTypeList] = useState<Type[]>(initialTypes)
  const [tagList, setTagList] = useState<Tag[]>(initialTags)
  const [blogsByType, setBlogsByType] = useState<BlogsByType>({})
  const [expandedTypes, setExpandedTypes] = useState<Set<number>>(new Set())
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(() => {
    const id = searchParams.get(API_PARAMS.TYPE_ID)
    return id ? parseInt(id, 10) : null
  })
  const [selectedTagId, setSelectedTagId] = useState<number | null>(() => {
    const id = searchParams.get('tagId')
    return id ? parseInt(id, 10) : null
  })
  const [loading, setLoading] = useState(false)
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // 分离推荐文章和普通文章
  const { recommendBlogs, normalBlogs } = useMemo(() => {
    const recommends = blogList.filter(b => b.recommend)
    const normals = blogList.filter(b => !b.recommend)
    return { recommendBlogs: recommends, normalBlogs: normals }
  }, [blogList])

  // 获取当前选中的分类名称
  const currentTypeName = useMemo(() => {
    if (selectedTypeId === null && selectedTagId === null) return null
    if (selectedTypeId !== null) {
      return typeList.find(t => t.id === selectedTypeId)?.name
    }
    if (selectedTagId !== null) {
      return tagList.find(t => t.id === selectedTagId)?.name
    }
    return null
  }, [selectedTypeId, selectedTagId, typeList, tagList])

  // 客户端获取博客列表（用于分页和筛选）
  const fetchBlogList = useCallback(async (page: number = pageInfo.current) => {
    try {
      setLoading(true)

      // 如果有选中标签，使用标签 API
      if (selectedTagId !== null) {
        const res = await fetch(
          `${ENDPOINTS.TAG_BLOGS(selectedTagId)}?${API_PARAMS.PAGE_NUM}=${page - 1}&${API_PARAMS.PAGE_SIZE}=${pageInfo.size}`
        )
        const result = await res.json()
        if (result.data) {
          setBlogList(result.data.content || [])
          setPageInfo(prev => ({
            ...prev,
            total: result.data.totalElements || 0,
            totalPages: result.data.totalPages || 1,
            current: page
          }))
        }
        return
      }

      // 否则使用普通博客列表 API
      const params: Record<string, string> = {
        [API_PARAMS.QUERY]: '',
        [API_PARAMS.PAGE_NUM]: String(page),
        [API_PARAMS.PAGE_SIZE]: String(pageInfo.size)
      }
      if (selectedTypeId !== null) {
        params[API_PARAMS.TYPE_ID] = String(selectedTypeId)
      }

      const response = await fetch(`${ENDPOINTS.BLOGS}?${new URLSearchParams(params)}`)
      const result = await response.json()

      if (result.data) {
        setBlogList(result.data.content)
        setPageInfo(prev => ({
          ...prev,
          total: result.data.totalElements,
          totalPages: result.data.totalPages,
          current: result.data.number + 1
        }))
      }
    } catch (error) {
      console.error('获取博客列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [pageInfo.size, selectedTypeId, selectedTagId])

  // 获取各分类下的文章标题（用于左侧二级导航）
  const fetchBlogsByType = useCallback(async () => {
    if (typeList.length === 0) return
    try {
      const map: BlogsByType = {}
      await Promise.all(
        typeList.map(async (type) => {
          try {
            // 使用正确的后端 API 端点
            const res = await fetch(
              `${ENDPOINTS.TYPE_BLOGS(type.id)}?${API_PARAMS.PAGE_NUM}=0&${API_PARAMS.PAGE_SIZE}=${BLOG_LIST_CONFIG.TYPE_BLOGS_PAGE_SIZE}`
            )
            const json = await res.json()
            const content = json.data?.content ?? json.content ?? []
            if (Array.isArray(content) && content.length > 0) {
              map[type.id] = content.map((b: Blog) => ({ id: b.id, title: b.title }))
            }
          } catch {
            // 忽略单个分类请求失败
          }
        })
      )
      setBlogsByType(map)
    } catch (error) {
      console.error('获取分类文章失败:', error)
    }
  }, [typeList])

  useEffect(() => {
    if (typeList.length > 0) {
      fetchBlogsByType()
    }
  }, [typeList, fetchBlogsByType])

  useEffect(() => {
    const typeIdParam = searchParams.get(API_PARAMS.TYPE_ID)
    const tagIdParam = searchParams.get('tagId')
    const typeId = typeIdParam ? parseInt(typeIdParam, 10) : null
    const tagId = tagIdParam ? parseInt(tagIdParam, 10) : null
    setSelectedTypeId(typeId)
    setSelectedTagId(tagId)
    setPageInfo(prev => ({ ...prev, current: 1 }))
    if (typeId !== null) {
      setExpandedTypes(prev => new Set(prev).add(typeId))
    }
    // URL 参数变化时重新获取文章列表
    fetchBlogList(1)
  }, [searchParams])

  const handleTypeSelect = (typeId: number | null) => {
    setSelectedTypeId(typeId)
    setSelectedTagId(null)
    setPageInfo(prev => ({ ...prev, current: 1 }))
    if (typeId !== null) {
      setExpandedTypes(prev => new Set(prev).add(typeId))
    }
    const url = typeId ? ROUTES.BLOG_LIST_WITH_TYPE(typeId) : ROUTES.BLOG_LIST
    router.push(url)
    setMobileNavOpen(false)
  }

  const handleTagSelect = (tagId: number | null) => {
    setSelectedTagId(tagId)
    setSelectedTypeId(null)
    setPageInfo(prev => ({ ...prev, current: 1 }))
    const url = tagId ? `${ROUTES.BLOG_LIST}?tagId=${tagId}` : ROUTES.BLOG_LIST
    router.push(url)
    setMobileNavOpen(false)
  }

  const toggleTypeExpand = (typeId: number) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageInfo.totalPages) {
      setPageInfo(prev => ({ ...prev, current: newPage }))
      fetchBlogList(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const current = pageInfo.current
    const totalPages = pageInfo.totalPages

    if (totalPages <= PAGINATION.ELLIPSIS_THRESHOLD) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 3) pages.push('...')
      if (current > 2) pages.push(current - 1)
      if (current !== 1 && current !== totalPages) pages.push(current)
      if (current < totalPages - 1) pages.push(current + 1)
      if (current < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  // 渲染左侧导航内容
  const renderSidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="blog-text-lg font-semibold text-[rgb(var(--text))] flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[rgb(var(--primary))]" />
          {BLOG_LABELS.NAV_TITLE}
        </h3>
        {/* 移动端关闭按钮 */}
        <button
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden p-1 rounded hover:bg-[rgb(var(--hover))]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Link
        href={ROUTES.BLOG_LIST}
        onClick={() => handleTypeSelect(null)}
        className={`block py-2 px-3 rounded-lg transition-colors blog-text-base mb-2 ${
          selectedTypeId === null
            ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] font-medium'
            : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]'
        }`}
      >
        {BLOG_LABELS.ALL_CATEGORIES}
      </Link>

      {typeList.map((type) => {
        const isExpanded = expandedTypes.has(type.id)
        const subBlogs = blogsByType[type.id] || []
        const isActive = selectedTypeId === type.id
        const articleCount = subBlogs.length

        return (
          <div key={type.id} className="mb-1">
            <div
              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]'
              }`}
              onClick={() => handleTypeSelect(type.id)}
            >
              <span className="blog-text-base font-medium truncate flex-1">
                {type.name}
              </span>
              {articleCount > 0 && (
                <span className="text-xs text-[rgb(var(--text-muted))] mr-2">
                  {articleCount}
                </span>
              )}
              {subBlogs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTypeExpand(type.id)
                  }}
                  className="p-0.5 rounded hover:bg-[rgb(var(--border)/0.3)] transition-colors"
                  aria-label={isExpanded ? BLOG_LABELS.COLLAPSE : BLOG_LABELS.EXPAND}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>

            {/* 二级导航 */}
            {isExpanded && subBlogs.length > 0 && (
              <div className="mt-0.5 space-y-0.5 pl-2 border-l border-[rgb(var(--blog-header-border))] ml-3 mb-3">
                {subBlogs.slice(0, BLOG_LIST_CONFIG.SUB_NAV_LIMIT).map((blog) => (
                  <Link
                    key={blog.id}
                    href={ROUTES.BLOG_DETAIL(blog.id)}
                    className="block py-1.5 px-2 rounded blog-nav-item truncate transition-colors duration-150 blog-text-sm"
                    title={blog.title}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {blog.title}
                  </Link>
                ))}
                {subBlogs.length > BLOG_LIST_CONFIG.SUB_NAV_LIMIT && (
                  <div className="py-1 px-2 blog-text-xs text-[rgb(var(--text-muted))]">
                    {BLOG_LABELS.ARTICLE_COUNT(subBlogs.length)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* 标签云 */}
      {tagList.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[rgb(var(--blog-header-border))]">
          <TagCloud
            tags={tagList}
            selectedTagId={selectedTagId}
            onTagClick={handleTagSelect}
          />
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] text-[rgb(var(--text))]">
      <BgOverlay />

      <main className="blog-main-prose w-full bg-[rgb(var(--bg)/0.8)] max-w-7xl mx-auto px-4 py-6 relative z-10 page-blog">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* 左侧导航 - 桌面端 */}
          <aside className="hidden lg:block shrink-0">
            <nav className="blog-nav-sidebar blog-page-scrollbar border-r border-[rgb(var(--blog-header-border))] pr-4">
              {renderSidebarContent()}
            </nav>
          </aside>

          {/* 移动端抽屉导航 */}
          {mobileNavOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[rgb(var(--card))] z-50 lg:hidden shadow-xl p-4 overflow-y-auto">
                {renderSidebarContent()}
              </aside>
            </>
          )}

          {/* 主内容区 */}
          <div className="min-w-0">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {/* 移动端筛选按钮 */}
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
                >
                  <Filter className="h-4 w-4" />
                </button>
                <h2 className="text-xl font-semibold text-[rgb(var(--text))]">
                  {currentTypeName || BLOG_LABELS.ALL_CATEGORIES}
                </h2>
                <span className="text-sm text-[rgb(var(--text-muted))]">
                  共 {pageInfo.total} 篇
                </span>
              </div>
            </div>

            {/* 移动端：分类筛选条 */}
            <div className="lg:hidden flex flex-wrap gap-2 mb-6 pb-4 border-b border-[rgb(var(--blog-header-border))]">
              <button
                onClick={() => handleTypeSelect(null)}
                className={`px-3 py-1.5 rounded-full blog-text-sm transition-colors ${
                  selectedTypeId === null
                    ? 'bg-[rgb(var(--primary))] text-white'
                    : 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)]'
                }`}
              >
                {BLOG_LABELS.ALL}
              </button>
              {typeList.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className={`px-3 py-1.5 rounded-full blog-text-sm transition-colors ${
                    selectedTypeId === type.id
                      ? 'bg-[rgb(var(--primary))] text-white'
                      : 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)]'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>

            {/* 加载状态 */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: BLOG_LIST_CONFIG.SKELETON_COUNT }).map((_, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 rounded-xl bg-[rgb(var(--card))] animate-pulse"
                  >
                    <div className="w-28 h-20 sm:w-36 sm:h-24 bg-[rgb(var(--muted))] rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-[rgb(var(--muted))] rounded w-3/4" />
                      <div className="h-4 bg-[rgb(var(--muted))] rounded w-full" />
                      <div className="h-4 bg-[rgb(var(--muted))] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : blogList.length === 0 ? (
              /* 空状态 */
              <div className="text-center py-16">
                <div className="text-[rgb(var(--text-muted))] blog-text-lg mb-4">
                  {BLOG_LABELS.NO_ARTICLES}
                </div>
                <button
                  onClick={() => handleTypeSelect(null)}
                  className="text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] blog-text-base hover:underline transition-colors"
                >
                  {BLOG_LABELS.VIEW_ALL}
                </button>
              </div>
            ) : (
              /* 文章列表 */
              <div className="space-y-8">
                {/* 推荐文章区域 */}
                {recommendBlogs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">
                      推荐阅读
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendBlogs.map((blog, index) => (
                        <FeaturedCard key={blog.id} blog={blog} index={index} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 普通文章列表 */}
                <section>
                  {recommendBlogs.length > 0 && (
                    <h3 className="text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">
                      最新博客
                    </h3>
                  )}
                  <div className="space-y-2">
                    {normalBlogs.map((blog, index) => (
                      <ArticleRow key={blog.id} blog={blog} index={index} />
                    ))}
                  </div>
                </section>

                {/* 分页 */}
                {pageInfo.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 pt-6">
                    <button
                      onClick={() => handlePageChange(pageInfo.current - 1)}
                      disabled={pageInfo.current === 1}
                      className="px-3 py-2 rounded-lg bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors blog-text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {generatePageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={typeof page !== 'number'}
                        className={`px-4 py-2 rounded-lg transition-colors blog-text-sm ${
                          typeof page === 'number' && page === pageInfo.current
                            ? 'bg-[rgb(var(--primary))] text-white'
                            : typeof page === 'number'
                            ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)]'
                            : 'bg-transparent text-[rgb(var(--text-muted))] cursor-default'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(pageInfo.current + 1)}
                      disabled={pageInfo.current === pageInfo.totalPages}
                      className="px-3 py-2 rounded-lg bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary)/0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors blog-text-sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
