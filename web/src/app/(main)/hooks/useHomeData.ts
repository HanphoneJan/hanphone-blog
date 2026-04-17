/**
 * 首页数据管理Hook
 * 管理所有数据获取：博客列表、分类、标签、推荐博客
 */

import { useState, useCallback, useEffect } from 'react'
import { ENDPOINTS } from '@/lib/api'
import { HOME_CONFIG, PAGINATION } from '@/lib/constants'
import { HOME_LABELS } from '@/lib/labels'
import type {
  Blog,
  Type,
  Tag,
  ApiResponse,
  PagedResponse,
  HomeQueryInfo
} from '../types'
import { compare } from '../utils'

interface UseHomeDataOptions {
  queryInfo: HomeQueryInfo
  selectedTypeId: number | null
  selectedTagIds: number[]
  getFromCache: <T>(key: string) => T | null
  setCache: <T>(key: string, data: T) => void
  // 初始数据（从服务端传入）
  initialBlogs?: Blog[]
  initialTypes?: Type[]
  initialTags?: Tag[]
  initialRecommendList?: Blog[]
  initialTotal?: number
}

interface UseHomeDataReturn {
  // 数据
  blogList: Blog[]
  typeList: Type[]
  tagList: Tag[]
  recommendList: Blog[]
  totalcount: number

  // 加载状态
  blogListLoading: boolean
  typeListLoading: boolean
  tagListLoading: boolean
  recommendListLoading: boolean

  // 可见性状态（用于过渡动画）
  blogListVisible: boolean
  typeListVisible: boolean
  tagListVisible: boolean
  recommendListVisible: boolean

  // 数据操作方法
  getBlogList: () => Promise<void>
  getTypeList: () => Promise<void>
  getTagList: () => Promise<void>
  getRecommendList: () => Promise<void>
  getFullTypeList: () => Promise<void>
  getFullTagList: () => Promise<void>
  selectType: (id: number, onFilterChange?: (text: string) => void) => Promise<void>
  selectTag: (id: number, currentSelectedTagIds: number[], onFilterChange?: (text: string) => void) => Promise<number[]>
  resetFilters: () => void

  // 设置器
  setBlogList: React.Dispatch<React.SetStateAction<Blog[]>>
  setTotalcount: React.Dispatch<React.SetStateAction<number>>
  setSelectedTypeId: React.Dispatch<React.SetStateAction<number | null>>
  setSelectedTagIds: React.Dispatch<React.SetStateAction<number[]>>
}

export function useHomeData(options: UseHomeDataOptions): UseHomeDataReturn {
  const {
    queryInfo,
    selectedTypeId,
    selectedTagIds,
    getFromCache,
    setCache,
    initialBlogs = [],
    initialTypes = [],
    initialTags = [],
    initialRecommendList = [],
    initialTotal = 0
  } = options

  // 数据状态（使用初始数据）
  const [blogList, setBlogList] = useState<Blog[]>(initialBlogs)
  const [typeList, setTypeList] = useState<Type[]>(initialTypes)
  const [tagList, setTagList] = useState<Tag[]>(initialTags)
  const [recommendList, setRecommendList] = useState<Blog[]>(initialRecommendList)
  const [totalcount, setTotalcount] = useState(initialTotal)

  // 加载状态（有初始数据则直接为 false）
  const [blogListLoading, setBlogListLoading] = useState(initialBlogs.length === 0)
  const [typeListLoading, setTypeListLoading] = useState(initialTypes.length === 0)
  const [tagListLoading, setTagListLoading] = useState(initialTags.length === 0)
  const [recommendListLoading, setRecommendListLoading] = useState(initialRecommendList.length === 0)

  // 可见性状态（用于过渡动画，有初始数据直接为 true）
  const [blogListVisible, setBlogListVisible] = useState(initialBlogs.length > 0)
  const [typeListVisible, setTypeListVisible] = useState(initialTypes.length > 0)
  const [tagListVisible, setTagListVisible] = useState(initialTags.length > 0)
  const [recommendListVisible, setRecommendListVisible] = useState(initialRecommendList.length > 0)

  // API调用函数（泛型类型）- 添加缓存支持
  const fetchData = useCallback(
    async <T = unknown,>(
      url: string,
      params?: Record<string, string | number | boolean | null | undefined>
    ): Promise<ApiResponse<T>> => {
      try {
        // 创建缓存键
        const cacheKey = params ? `${url}?${JSON.stringify(params)}` : url

        // 尝试从缓存获取数据
        const cachedData = getFromCache<ApiResponse<T>>(cacheKey)
        if (cachedData) {
          return cachedData
        }

        if (!params) {
          const res = await fetch(url)
          const data = (await res.json()) as ApiResponse<T>
          setCache(cacheKey, data)
          return data
        }

        // 过滤掉 undefined 和 null 的参数值
        const validParams = Object.entries(params).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value)
            }
            return acc
          },
          {}
        )

        const queryParams = new URLSearchParams(validParams).toString()
        const fullUrl = `${url}?${queryParams}`
        const res = await fetch(fullUrl)
        const data = (await res.json()) as ApiResponse<T>
        setCache(cacheKey, data)
        return data
      } catch (error) {
        console.log(`Error fetching ${url}:`, error)
        return { data: [] as unknown as T }
      }
    },
    [getFromCache, setCache]
  )

  // 获取博客列表
  const getBlogList = useCallback(async () => {
    setBlogListLoading(true)
    setBlogListVisible(false)
    try {
      const res = await fetchData<PagedResponse<Blog>>(ENDPOINTS.BLOGS, { ...queryInfo })
      // 对博客列表进行排序，推荐博客优先
      const sortedBlogs = (res.data?.content || []).sort((a, b) => {
        if (b.recommend && !a.recommend) return 1
        if (a.recommend && !b.recommend) return -1
        return 0
      })
      setBlogList(sortedBlogs)
      setTotalcount(res.data?.totalElements || 0)
      setTimeout(() => setBlogListVisible(true), 100)
    } finally {
      setBlogListLoading(false)
    }
  }, [fetchData, queryInfo])

  // 获取推荐博客列表
  const getRecommendList = useCallback(async () => {
    setRecommendListLoading(true)
    setRecommendListVisible(false)
    try {
      const res = await fetchData<Blog[]>(ENDPOINTS.RECOMMEND_BLOG_LIST)
      setRecommendList(res.data || [])
      setTimeout(() => setRecommendListVisible(true), 100)
    } finally {
      setRecommendListLoading(false)
    }
  }, [fetchData])

  // 获取博客类型列表
  const getTypeList = useCallback(async () => {
    setTypeListLoading(true)
    setTypeListVisible(false)
    try {
      const res = await fetchData<Type[]>(ENDPOINTS.TYPE_LIST)
      setTypeList(res.data || [])
      setTimeout(() => setTypeListVisible(true), 100)
    } finally {
      setTypeListLoading(false)
    }
  }, [fetchData])

  // 获取博客标签列表
  const getTagList = useCallback(async () => {
    setTagListLoading(true)
    setTagListVisible(false)
    try {
      const res = await fetchData<Tag[]>(ENDPOINTS.TAG_LIST)
      setTagList(res.data || [])
      setTimeout(() => setTagListVisible(true), 100)
    } finally {
      setTagListLoading(false)
    }
  }, [fetchData])

  // 获取所有分类
  const getFullTypeList = useCallback(async () => {
    setTypeListLoading(true)
    setTypeListVisible(false)
    try {
      const res = await fetchData<Type[]>(ENDPOINTS.FULL_TYPE_LIST)
      setTypeList(res.data?.sort(compare<Type>('blogs')) || [])
      setTimeout(() => setTypeListVisible(true), 100)
    } finally {
      setTypeListLoading(false)
    }
  }, [fetchData])

  // 获取所有标签
  const getFullTagList = useCallback(async () => {
    setTagListLoading(true)
    setTagListVisible(false)
    try {
      const res = await fetchData<Tag[]>(ENDPOINTS.FULL_TAG_LIST)
      setTagList(res.data?.sort(compare<Tag>('blogs')) || [])
      setTimeout(() => setTagListVisible(true), 100)
    } finally {
      setTagListLoading(false)
    }
  }, [fetchData])

  // 按分类筛选博客
  const selectType = useCallback(
    async (id: number, onFilterChange?: (text: string) => void) => {
      setBlogListLoading(true)
      setBlogListVisible(false)

      try {
        // 创建缓存键
        const cacheKey = `type_${id}_tags_${selectedTagIds.join(',')}`
        let filteredBlogs: Blog[] = []

        // 尝试从缓存获取数据
        const cachedData = getFromCache<Blog[]>(cacheKey)
        if (cachedData) {
          filteredBlogs = cachedData
        } else {
          // 获取分类下的博客
          const typeRes = await fetchData<PagedResponse<Blog>>(ENDPOINTS.TYPE_BLOGS(id))
          filteredBlogs = typeRes.data?.content || []

          // 如果有选中的标签，进一步筛选
          if (selectedTagIds.length > 0) {
            const tagPromises = selectedTagIds.map((tagId) =>
              fetchData<PagedResponse<Blog>>(ENDPOINTS.TAG_BLOGS(tagId))
            )

            const tagResponses = await Promise.all(tagPromises)
            const tagBlogsArrays = tagResponses.map((res) => res.data?.content || [])

            // 找出所有标签的交集
            filteredBlogs = filteredBlogs.filter((blog) =>
              tagBlogsArrays.every((tagBlogs) => tagBlogs.some((tagBlog) => tagBlog.id === blog.id))
            )
          }

          // 对博客列表进行排序，推荐博客优先
          filteredBlogs = filteredBlogs.sort((a, b) => {
            if (b.recommend && !a.recommend) return 1
            if (a.recommend && !b.recommend) return -1
            return 0
          })

          // 缓存结果
          setCache(cacheKey, filteredBlogs)
        }

        setBlogList(filteredBlogs)
        setTotalcount(filteredBlogs.length)
        setTimeout(() => setBlogListVisible(true), 100)

        // 更新筛选文本
        const type = typeList.find((item) => item.id === id)
        let methodText = type ? `分类: ${type.name}` : ''

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

        onFilterChange?.(methodText)
      } finally {
        setBlogListLoading(false)
      }
    },
    [fetchData, selectedTagIds, typeList, tagList, getFromCache, setCache]
  )

  // 按标签筛选博客（支持多选）
  const selectTag = useCallback(
    async (id: number, currentSelectedTagIds: number[], onFilterChange?: (text: string) => void) => {
      // 切换标签选中状态
      const newSelectedTagIds = currentSelectedTagIds.includes(id)
        ? currentSelectedTagIds.filter((tagId) => tagId !== id)
        : [...currentSelectedTagIds, id]

      setBlogListLoading(true)
      setBlogListVisible(false)

      try {
        // 创建缓存键
        const cacheKey = `type_${selectedTypeId || 'null'}_tags_${newSelectedTagIds.join(',')}`
        let filteredBlogs: Blog[] = []

        // 尝试从缓存获取数据
        const cachedData = getFromCache<Blog[]>(cacheKey)
        if (cachedData) {
          filteredBlogs = cachedData
        } else {
          // 如果有选中的分类，先获取分类下的博客
          if (selectedTypeId !== null) {
            const typeRes = await fetchData<PagedResponse<Blog>>(ENDPOINTS.TYPE_BLOGS(selectedTypeId))
            filteredBlogs = typeRes.data?.content || []
          } else {
            // 否则获取所有博客
            const allBlogsRes = await fetchData<PagedResponse<Blog>>(ENDPOINTS.BLOGS, {
              ...queryInfo,
              pagenum: PAGINATION.DEFAULT_PAGE,
              pagesize: HOME_CONFIG.ALL_BLOGS_PAGE_SIZE
            })
            filteredBlogs = allBlogsRes.data?.content || []
          }

          // 如果有选中的标签，进一步筛选
          if (newSelectedTagIds.length > 0) {
            const tagPromises = newSelectedTagIds.map((tagId) =>
              fetchData<PagedResponse<Blog>>(ENDPOINTS.TAG_BLOGS(tagId))
            )

            const tagResponses = await Promise.all(tagPromises)
            const tagBlogsArrays = tagResponses.map((res) => res.data?.content || [])

            // 找出所有标签的交集
            filteredBlogs = filteredBlogs.filter((blog) =>
              tagBlogsArrays.every((tagBlogs) => tagBlogs.some((tagBlog) => tagBlog.id === blog.id))
            )
          }

          // 对博客列表进行排序，推荐博客优先
          filteredBlogs = filteredBlogs.sort((a, b) => {
            if (b.recommend && !a.recommend) return 1
            if (a.recommend && !b.recommend) return -1
            return 0
          })

          // 缓存结果
          setCache(cacheKey, filteredBlogs)
        }

        setBlogList(filteredBlogs)
        setTotalcount(filteredBlogs.length)
        setTimeout(() => setBlogListVisible(true), 100)

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

        onFilterChange?.(methodText)
      } finally {
        setBlogListLoading(false)
      }

      return newSelectedTagIds
    },
    [fetchData, selectedTypeId, typeList, tagList, queryInfo, getFromCache, setCache]
  )

  // 重置筛选
  const resetFilters = useCallback(() => {
    setBlogList([])
    setTotalcount(0)
  }, [])

  // 设置器（供外部使用）
  const setSelectedTypeId = useCallback((value: React.SetStateAction<number | null>) => {
    // 这个函数在useHomeData内部不使用，只是作为返回值供外部使用
  }, []) as React.Dispatch<React.SetStateAction<number | null>>

  const setSelectedTagIds = useCallback((value: React.SetStateAction<number[]>) => {
    // 这个函数在useHomeData内部不使用，只是作为返回值供外部使用
  }, []) as React.Dispatch<React.SetStateAction<number[]>>

  return {
    // 数据
    blogList,
    typeList,
    tagList,
    recommendList,
    totalcount,

    // 加载状态
    blogListLoading,
    typeListLoading,
    tagListLoading,
    recommendListLoading,

    // 可见性状态
    blogListVisible,
    typeListVisible,
    tagListVisible,
    recommendListVisible,

    // 操作方法
    getBlogList,
    getTypeList,
    getTagList,
    getRecommendList,
    getFullTypeList,
    getFullTagList,
    selectType,
    selectTag,
    resetFilters,

    // 设置器
    setBlogList,
    setTotalcount,
    setSelectedTypeId,
    setSelectedTagIds
  }
}
