'use client'

import BgOverlay from '@/app/(main)/components/BgOverlay'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ListTree,
  SlidersHorizontal,
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
import { BlogCategoryTree } from './components/BlogCategoryTree'
import { BlogFilterPanel } from './components/BlogFilterPanel'
import { Pagination } from '../components/Pagination'
import type { Blog, Type, Tag, PageInfo, BlogsByType } from './types'

interface BlogListClientProps {
  initialBlogs: Blog[]
  initialRecommendBlogs: Blog[]
  initialTypes: Type[]
  initialPageInfo: PageInfo
  initialTags?: Tag[]
}

export default function BlogListClient({
  initialBlogs,
  initialRecommendBlogs,
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [inputPage, setInputPage] = useState(pageInfo.current)

  // 是否展示推荐博客：仅第一页且无筛选条件
  const showRecommendBlogs = useMemo(() => {
    return pageInfo.current === 1 &&
      selectedTypeId === null &&
      selectedTagId === null
  }, [pageInfo.current, selectedTypeId, selectedTagId])

  // 获取当前筛选状态文本
  const filterStatusText = useMemo(() => {
    if (selectedTypeId !== null && selectedTagId !== null) {
      const typeName = typeList.find(t => t.id === selectedTypeId)?.name
      const tagName = tagList.find(t => t.id === selectedTagId)?.name
      return `分类: ${typeName} · 标签: ${tagName}`
    }
    if (selectedTypeId !== null) {
      return typeList.find(t => t.id === selectedTypeId)?.name
    }
    if (selectedTagId !== null) {
      return `标签: ${tagList.find(t => t.id === selectedTagId)?.name}`
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

  // 客户端 fallback：如果服务端未获取到分类，从客户端获取
  useEffect(() => {
    if (typeList.length === 0) {
      fetch(ENDPOINTS.TYPE_LIST)
        .then(res => res.json())
        .then(data => {
          if (data.code === 200 && data.data) {
            setTypeList(data.data)
          }
        })
        .catch(err => console.error('客户端获取分类失败:', err))
    }
  }, [typeList.length])

  // 客户端 fallback：如果服务端未获取到标签，从客户端获取
  useEffect(() => {
    if (tagList.length === 0) {
      fetch(ENDPOINTS.FULL_TAG_LIST)
        .then(res => res.json())
        .then(data => {
          if (data.code === 200 && data.data) {
            setTagList(data.data.map((tag: { id: number; name: string; blogNumber?: number }) => ({
              id: tag.id,
              name: tag.name,
              blogCount: tag.blogNumber || 0
            })))
          }
        })
        .catch(err => console.error('客户端获取标签失败:', err))
    }
  }, [tagList.length])

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
    setMobileFilterOpen(false)
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

  const resetFilters = () => {
    setSelectedTypeId(null)
    setSelectedTagId(null)
    setPageInfo(prev => ({ ...prev, current: 1 }))
    router.push(ROUTES.BLOG_LIST)
    setMobileNavOpen(false)
    setMobileFilterOpen(false)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageInfo.totalPages) {
      setPageInfo(prev => ({ ...prev, current: newPage }))
      setInputPage(newPage)
      fetchBlogList(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePageInputChange = (newPage: number) => {
    setInputPage(newPage)
  }

  const isCompactLayout = () => {
    return typeof window !== 'undefined' && window.innerWidth < 640
  }

  const hasActiveFilter = selectedTypeId !== null || selectedTagId !== null

  return (
    <div className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] text-[rgb(var(--text))]">
      <BgOverlay />

      <main className="blog-main-prose w-full bg-[rgb(var(--bg)/0.8)] px-4 sm:px-6 lg:px-8 py-6 relative z-10 page-blog">
        {/* 三栏布局 - 固定高度，支持独立滚动 */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_240px] gap-6 lg:h-[calc(100vh-120px)]">

          {/* 左侧目录树 - 桌面端 */}
          <aside className="hidden lg:block shrink-0 lg:overflow-y-auto lg:blog-page-scrollbar pr-2">
            <nav className="blog-nav-sidebar">
              <BlogCategoryTree
                types={typeList}
                blogsByType={blogsByType}
                selectedTypeId={selectedTypeId}
                expandedTypes={expandedTypes}
                onToggleExpand={toggleTypeExpand}
                onSelectType={handleTypeSelect}
              />
            </nav>
          </aside>

          {/* 左侧抽屉 - 移动端目录树 */}
          {mobileNavOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[rgb(var(--card))] z-50 lg:hidden shadow-xl p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[rgb(var(--text))]">目录</h3>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-1 rounded hover:bg-[rgb(var(--hover))]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <BlogCategoryTree
                  types={typeList}
                  blogsByType={blogsByType}
                  selectedTypeId={selectedTypeId}
                  expandedTypes={expandedTypes}
                  onToggleExpand={toggleTypeExpand}
                  onSelectType={handleTypeSelect}
                />
              </aside>
            </>
          )}

          {/* 中间内容区 */}
          <div className="min-w-0 lg:overflow-y-auto lg:blog-page-scrollbar lg:px-2">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between mb-6">
              {/* 移动端布局 */}
              <div className="flex items-center justify-between w-full lg:hidden">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="p-2 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
                  title="打开目录"
                >
                  <ListTree className="h-4 w-4" />
                </button>

                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl font-semibold text-[rgb(var(--text))]">
                    {filterStatusText || BLOG_LABELS.ALL_CATEGORIES}
                  </h2>
                  <span className="text-sm text-[rgb(var(--text-muted))]">
                    共 {pageInfo.total} 篇
                  </span>
                </div>

                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="p-2 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
                  title="打开筛选"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* 桌面端布局 */}
              <div className="hidden lg:flex items-center gap-3">
                <h2 className="text-xl font-semibold text-[rgb(var(--text))]">
                  {filterStatusText || BLOG_LABELS.ALL_CATEGORIES}
                </h2>
                <span className="text-sm text-[rgb(var(--text-muted))]">
                  共 {pageInfo.total} 篇
                </span>
              </div>

              {/* 重置筛选按钮 */}
              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.08)] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  重置
                </button>
              )}
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
                  onClick={resetFilters}
                  className="text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] blog-text-base hover:underline transition-colors"
                >
                  {BLOG_LABELS.VIEW_ALL}
                </button>
              </div>
            ) : (
              /* 文章列表 */
              <div className="space-y-8">
                {/* 推荐博客区域 - 仅第一页且无筛选时显示 */}
                {showRecommendBlogs && initialRecommendBlogs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">
                      推荐阅读
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {initialRecommendBlogs.map((blog, index) => (
                        <FeaturedCard key={blog.id} blog={blog} index={index} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 普通文章列表 */}
                <section>
                  {showRecommendBlogs && initialRecommendBlogs.length > 0 && (
                    <h3 className="text-sm font-medium text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">
                      最新博客
                    </h3>
                  )}
                  <div className="space-y-2">
                    {blogList.map((blog, index) => (
                      <ArticleRow key={blog.id} blog={blog} index={index} />
                    ))}
                  </div>
                </section>

                {/* 分页 */}
                {pageInfo.totalPages > 1 && (
                  <Pagination
                    totalcount={pageInfo.total}
                    currentPage={pageInfo.current}
                    pageSize={pageInfo.size}
                    isCompact={isCompactLayout()}
                    onPageChange={handlePageChange}
                    onInputChange={handlePageInputChange}
                  />
                )}
              </div>
            )}
          </div>

          {/* 右侧筛选面板 - 桌面端 */}
          <aside className="hidden lg:block shrink-0 lg:overflow-y-auto lg:blog-page-scrollbar pl-2">
            <div className="blog-filter-sidebar">
              <BlogFilterPanel
                types={typeList}
                blogsByType={blogsByType}
                selectedTypeId={selectedTypeId}
                tags={tagList}
                selectedTagId={selectedTagId}
                onSelectType={handleTypeSelect}
                onSelectTag={handleTagSelect}
              />
            </div>
          </aside>

          {/* 右侧抽屉 - 移动端筛选 */}
          {mobileFilterOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setMobileFilterOpen(false)}
              />
              <aside className="fixed right-0 top-0 bottom-0 w-72 bg-[rgb(var(--card))] z-50 lg:hidden shadow-xl p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[rgb(var(--text))]">筛选</h3>
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    className="p-1 rounded hover:bg-[rgb(var(--hover))]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <BlogFilterPanel
                  types={typeList}
                  blogsByType={blogsByType}
                  selectedTypeId={selectedTypeId}
                  tags={tagList}
                  selectedTagId={selectedTagId}
                  onSelectType={handleTypeSelect}
                  onSelectTag={handleTagSelect}
                />
              </aside>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
