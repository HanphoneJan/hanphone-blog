'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Filter } from 'lucide-react'
import Footer from '@/components/Footer'
import { PAGINATION, HOME_CONFIG } from '@/lib/constants'
import { HOME_LABELS } from '@/lib/labels'

import { useHomeCache } from './hooks/useHomeCache'
import { useTypewriter } from './hooks/useTypewriter'
import { useHomeData } from './hooks/useHomeData'
import { isCompactLayout } from './utils'
import BgOverlay from '@/app/(main)/components/BgOverlay'

import { BlogList } from './components/BlogList'
import { Sidebar } from './components/Sidebar'
import { MobileSidebar } from './components/MobileSidebar'
import { Pagination } from './components/Pagination'

import type { HomeQueryInfo, Blog, Type, Tag } from './types'

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

const heroVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
} as const

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
} as const

const sidebarVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
} as const

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
} as const

const counterVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: 0.3,
      type: 'spring',
      stiffness: 300
    }
  }
} as const

interface HomeClientProps {
  initialBlogs: Blog[]
  initialTypes: Type[]
  initialTags: Tag[]
  initialRecommendList: Blog[]
  initialTotal: number
}

export default function HomeClient({
  initialBlogs,
  initialTypes,
  initialTags,
  initialRecommendList,
  initialTotal
}: HomeClientProps) {
  // 打字机效果
  const intro = useTypewriter({
    text: HOME_LABELS.INTRO_TYPING
  })

  // 页面加载时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 缓存
  const { getFromCache, setCache } = useHomeCache()

  // 查询参数状态
  const [queryInfo, setQueryInfo] = useState<HomeQueryInfo>({
    query: '',
    pagenum: PAGINATION.DEFAULT_PAGE,
    pagesize: PAGINATION.BLOG_PAGE_SIZE
  })

  // 筛选状态
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectMethod, setSelectMethod] = useState<string>(HOME_LABELS.ALL_BLOGS)
  const [selected, setSelected] = useState(false)

  // UI状态
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTypes, setShowTypes] = useState(true)
  const [showTags, setShowTags] = useState(true)
  const [moreType, setMoreType] = useState(true)
  const [moreTag, setMoreTag] = useState(true)
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : HOME_CONFIG.INIT_SCREEN_WIDTH
  )

  // 数据管理 - 传入初始数据
  const {
    blogList,
    typeList,
    tagList,
    recommendList,
    totalcount,
    blogListLoading,
    typeListLoading,
    tagListLoading,
    recommendListLoading,
    blogListVisible,
    typeListVisible,
    tagListVisible,
    recommendListVisible,
    getBlogList,
    getTypeList,
    getTagList,
    getRecommendList,
    getFullTypeList,
    getFullTagList,
    setBlogList,
    setTotalcount
  } = useHomeData({
    queryInfo,
    selectedTypeId,
    selectedTagIds,
    getFromCache,
    setCache,
    initialBlogs,
    initialTypes,
    initialTags,
    initialRecommendList,
    initialTotal
  })

  // 分页布局
  const isCompact = useMemo(() => isCompactLayout(screenWidth), [screenWidth])

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
      if (window.innerWidth >= HOME_CONFIG.SIDEBAR_CLOSE_BREAKPOINT) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 获取初始数据（仅在需要时）
  useEffect(() => {
    if (initialBlogs.length === 0) {
      getTypeList()
      getBlogList()
      getTagList()
      getRecommendList()
    }
  }, [getTypeList, getBlogList, getTagList, getRecommendList, initialBlogs.length])

  // 当查询信息变化时重新获取博客列表 - 添加防抖
  useEffect(() => {
    if (selectedTypeId === null && selectedTagIds.length === 0) {
      const timer = setTimeout(() => {
        getBlogList()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [queryInfo, getBlogList, selectedTypeId, selectedTagIds])

  // 更新selectMethod显示当前选中的分类与标签
  const updateSelectMethod = useCallback(() => {
    let methodText = ''

    if (selectedTypeId !== null) {
      const type = typeList.find((item) => item.id === selectedTypeId)
      if (type) methodText += `分类: ${type.name}`
    }

    if (selectedTagIds.length > 0) {
      if (methodText) methodText += ' + '
      methodText += '标签: '

      const tagNames = selectedTagIds
        .map((tagId) => {
          const tag = tagList.find((item) => item.id === tagId)
          return tag ? tag.name : ''
        })
        .filter((name) => name)

      methodText += tagNames.join(', ')
    }

    if (!methodText) {
      methodText = HOME_LABELS.ALL_BLOGS
    }

    setSelectMethod(methodText)
  }, [selectedTypeId, selectedTagIds, typeList, tagList])

  // 在 typeList 和 tagList 加载完成后更新 selectMethod
  useEffect(() => {
    if (typeList.length > 0 || tagList.length > 0) {
      updateSelectMethod()
    }
  }, [typeList, tagList, updateSelectMethod])

  // 修改当前页码
  const handleCurrentChange = useCallback(
    (newPage: number) => {
      setQueryInfo((prev) => ({ ...prev, pagenum: newPage }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setQueryInfo]
  )

  // 处理分页输入变化
  const handlePageInputChange = useCallback(
    (page: number) => {
      setQueryInfo((prev) => ({ ...prev, pagenum: page }))
    },
    [setQueryInfo]
  )

  // 按分类筛选博客
  const handleSelectType = useCallback(
    async (id: number) => {
      setSelectedTypeId(id)
      setSelected(true)

      // 创建缓存键
      const cacheKey = `type_${id}_tags_${selectedTagIds.join(',')}`
      let filteredBlogs = getFromCache<typeof blogList>(cacheKey)

      if (!filteredBlogs) {
        // 获取分类下的博客
        try {
          const typeRes = await fetch(`/api/types/${id}`)
          const typeData = await typeRes.json()
          filteredBlogs = typeData.data?.content || []

          // 如果有选中的标签，进一步筛选
          if (selectedTagIds.length > 0) {
            const tagPromises = selectedTagIds.map((tagId) =>
              fetch(`/api/tags/${tagId}`).then((res) => res.json())
            )

            const tagResponses = await Promise.all(tagPromises)
            const tagBlogsArrays = tagResponses.map((res) => res.data?.content || [])

            filteredBlogs = filteredBlogs.filter((blog) =>
              tagBlogsArrays.every((tagBlogs: Blog[]) =>
                tagBlogs.some((tagBlog: Blog) => tagBlog.id === blog.id)
              )
            )
          }

          // 对博客列表进行排序，推荐博客优先
          filteredBlogs = filteredBlogs.sort((a, b) => {
            if (b.recommend && !a.recommend) return 1
            if (a.recommend && !b.recommend) return -1
            return 0
          })

          setCache(cacheKey, filteredBlogs)
        } catch (error) {
          console.error('Error selecting type:', error)
          return
        }
      }

      setBlogList(filteredBlogs)
      setTotalcount(filteredBlogs.length)
      updateSelectMethod()
      setSidebarOpen(false)
    },
    [selectedTagIds, getFromCache, setCache, setBlogList, setTotalcount, updateSelectMethod]
  )

  // 按标签筛选博客（支持多选）
  const handleSelectTag = useCallback(
    async (id: number) => {
      // 切换标签选中状态
      const newSelectedTagIds = selectedTagIds.includes(id)
        ? selectedTagIds.filter((tagId) => tagId !== id)
        : [...selectedTagIds, id]

      setSelectedTagIds(newSelectedTagIds)
      setSelected(true)

      // 创建缓存键
      const cacheKey = `type_${selectedTypeId || 'null'}_tags_${newSelectedTagIds.join(',')}`
      let filteredBlogs = getFromCache<typeof blogList>(cacheKey)

      if (!filteredBlogs) {
        try {
          // 如果有选中的分类，先获取分类下的博客
          if (selectedTypeId !== null) {
            const typeRes = await fetch(`/api/types/${selectedTypeId}`)
            const typeData = await typeRes.json()
            filteredBlogs = typeData.data?.content || []
          } else {
            // 否则获取所有博客
            const allBlogsRes = await fetch(
              `/api/blogs?pagenum=1&pagesize=${HOME_CONFIG.ALL_BLOGS_PAGE_SIZE}`
            )
            const allBlogsData = await allBlogsRes.json()
            filteredBlogs = allBlogsData.data?.content || []
          }

          // 如果有选中的标签，进一步筛选
          if (newSelectedTagIds.length > 0) {
            const tagPromises = newSelectedTagIds.map((tagId) =>
              fetch(`/api/tags/${tagId}`).then((res) => res.json())
            )

            const tagResponses = await Promise.all(tagPromises)
            const tagBlogsArrays = tagResponses.map((res) => res.data?.content || [])

            filteredBlogs = filteredBlogs.filter((blog) =>
              tagBlogsArrays.every((tagBlogs: Blog[]) =>
                tagBlogs.some((tagBlog: Blog) => tagBlog.id === blog.id)
              )
            )
          }

          // 对博客列表进行排序，推荐博客优先
          filteredBlogs = filteredBlogs.sort((a, b) => {
            if (b.recommend && !a.recommend) return 1
            if (a.recommend && !b.recommend) return -1
            return 0
          })

          setCache(cacheKey, filteredBlogs)
        } catch (error) {
          console.error('Error selecting tag:', error)
          return
        }
      }

      setBlogList(filteredBlogs)
      setTotalcount(filteredBlogs.length)

      // 更新筛选文本
      let methodText = ''

      if (selectedTypeId !== null) {
        const type = typeList.find((item) => item.id === selectedTypeId)
        if (type) methodText += `分类: ${type.name}`
      }

      if (newSelectedTagIds.length > 0) {
        if (methodText) methodText += ' + '
        methodText += '标签: '

        const tagNames = newSelectedTagIds
          .map((tagId) => {
            const tag = tagList.find((item) => item.id === tagId)
            return tag ? tag.name : ''
          })
          .filter((name) => name)

        methodText += tagNames.join(', ')
      }

      if (!methodText) {
        methodText = HOME_LABELS.ALL_BLOGS
      }

      setSelectMethod(methodText)
      setSidebarOpen(false)
    },
    [
      selectedTagIds,
      selectedTypeId,
      typeList,
      tagList,
      getFromCache,
      setCache,
      setBlogList,
      setTotalcount
    ]
  )

  // 处理分类展开/收起
  const handleDealType = useCallback(async () => {
    if (moreType) {
      await getFullTypeList()
    } else {
      await getTypeList()
    }
    setMoreType((prev) => !prev)
  }, [moreType, getFullTypeList, getTypeList])

  // 处理标签展开/收起
  const handleDealTag = useCallback(async () => {
    if (moreTag) {
      await getFullTagList()
    } else {
      await getTagList()
    }
    setMoreTag((prev) => !prev)
  }, [moreTag, getFullTagList, getTagList])

  // 更新博客列表（重置筛选）
  const updateBlogList = useCallback(() => {
    setSelected(false)
    setSelectedTypeId(null)
    setSelectedTagIds([])
    setSelectMethod(HOME_LABELS.ALL_BLOGS)
    setQueryInfo((prev) => ({ ...prev, pagenum: 1 }))
    getBlogList()
  }, [getBlogList])

  return (
    <motion.div
      className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] overflow-hidden"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <BgOverlay />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:pt-4 relative z-10">
        {/* 打字机效果区域 */}
        <motion.div
          className="w-full py-10 relative overflow-hidden md:mb-4"
          variants={heroVariants}
        >
          <div className="absolute inset-0 bg-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="flex justify-center items-center min-h-[120px]">
              <motion.h1
                className="text-xl md:text-2xl font-light text-[rgb(var(--primary))] text-center tracking-wide relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {intro}
                <motion.span
                  className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-3 h-5 bg-[rgb(var(--primary))]"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </motion.h1>
            </div>
          </div>
        </motion.div>

        {/* 博客内容区域 */}
        <motion.div
          className="w-full"
          variants={contentVariants}
        >
          {/* 移动端侧边栏 */}
          <MobileSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selected={selected}
            onResetFilters={updateBlogList}
            types={typeList}
            selectedTypeId={selectedTypeId}
            typeLoading={typeListLoading}
            typeVisible={typeListVisible}
            showTypes={showTypes}
            moreType={moreType}
            onToggleShowTypes={() => setShowTypes((prev) => !prev)}
            onSelectType={handleSelectType}
            onToggleMoreType={handleDealType}
            tags={tagList}
            selectedTagIds={selectedTagIds}
            tagLoading={tagListLoading}
            tagVisible={tagListVisible}
            showTags={showTags}
            moreTag={moreTag}
            onToggleShowTags={() => setShowTags((prev) => !prev)}
            onSelectTag={handleSelectTag}
            onToggleMoreTag={handleDealTag}
          />

          {/* 主内容区网格布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧博客列表 */}
            <motion.div
              className="lg:col-span-3"
              variants={contentVariants}
            >
              <div className="bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm rounded-xl shadow-sm p-4 border border-[rgb(var(--border))]">
                {/* 标题栏 */}
                <motion.div
                  className="flex justify-between items-center lg:cursor-default cursor-pointer relative"
                  onClick={() => screenWidth < 1024 && setSidebarOpen(true)}
                  variants={headerVariants}
                >
                  <div className="flex items-center">
                    <AnimatePresence mode="wait">
                      {selected && (
                        <motion.div
                          key="back-btn"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowLeft
                            className="mr-2 text-[rgb(var(--primary))] cursor-pointer hover:scale-110 transition-transform h-5 w-5 z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateBlogList()
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {screenWidth < 1024 && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSidebarOpen(true)
                        }}
                        className="mr-2 p-2 rounded-lg hover:bg-[rgb(var(--primary)/0.1)] transition-colors z-10"
                        aria-label="打开筛选菜单"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Filter className="h-5 w-5 text-[rgb(var(--primary))]" />
                      </motion.button>
                    )}
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selectMethod}
                        className="text-xl font-bold text-[rgb(var(--primary))]"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                      >
                        {selectMethod}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <motion.span
                    className="text-[rgb(var(--text-muted))]"
                    variants={counterVariants}
                  >
                    共{' '}
                    <motion.span
                      key={totalcount}
                      className="text-[rgb(var(--primary))] text-xl font-bold"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {totalcount}
                    </motion.span>{' '}
                    篇
                  </motion.span>

                  {screenWidth < 1024 && (
                    <div className="absolute inset-0 rounded-lg bg-[rgb(var(--primary)/0.1)] opacity-0 hover:opacity-30 transition-opacity pointer-events-none"></div>
                  )}
                </motion.div>

                {/* 博客列表 */}
                <BlogList
                  blogs={blogList}
                  loading={blogListLoading}
                  visible={blogListVisible}
                  pageSize={queryInfo.pagesize}
                />

                {/* 分页组件 */}
                <Pagination
                  totalcount={totalcount}
                  queryInfo={queryInfo}
                  isCompact={isCompact}
                  onPageChange={handleCurrentChange}
                  onInputChange={handlePageInputChange}
                />
              </div>
            </motion.div>

            {/* 桌面端侧边栏 */}
            <motion.div
              className="hidden lg:block"
              variants={sidebarVariants}
            >
              <Sidebar
                recommendList={recommendList}
                recommendLoading={recommendListLoading}
                recommendVisible={recommendListVisible}
                types={typeList}
                selectedTypeId={selectedTypeId}
                typeLoading={typeListLoading}
                typeVisible={typeListVisible}
                showTypes={showTypes}
                moreType={moreType}
                onToggleShowTypes={() => setShowTypes((prev) => !prev)}
                onSelectType={handleSelectType}
                onToggleMoreType={handleDealType}
                tags={tagList}
                selectedTagIds={selectedTagIds}
                tagLoading={tagListLoading}
                tagVisible={tagListVisible}
                showTags={showTags}
                moreTag={moreTag}
                onToggleShowTags={() => setShowTags((prev) => !prev)}
                onSelectTag={handleSelectTag}
                onToggleMoreTag={handleDealTag}
              />
            </motion.div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </motion.div>
  )
}
