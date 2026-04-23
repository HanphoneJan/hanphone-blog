'use client'

import { useEffect, useCallback, JSX, useReducer } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Code, Gamepad2, Layers, Search, ChevronDown, X, ToolCase, Star } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import { ENDPOINTS } from '@/lib/api'
import { PROJECT_LABELS } from '@/lib/labels'

// 动画变体定义
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  hover: {
    y: -4,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
}

const dropdownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15
    }
  }
}

const emptyStateVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const tagVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.15
    }
  }
}

// 定义项目类型接口
interface Project {
  id: number
  title: string
  content: string
  techs: string
  pic_url: string
  url: string
  type: number // 0: 不展示  1：完整项目, 2: 工具箱, 3: 小游戏 4：小练习
  recommend: boolean // 新增：是否推荐项目
}

// 项目类型配置
interface ProjectTypeConfig {
  id: number
  name: string
  filterKey: string
  icon: JSX.Element
  layout: 'large' | 'small'
  showInFilter: boolean
}

const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: 1,
    name: PROJECT_LABELS.FULL_PROJECT,
    filterKey: 'projects',
    icon: <Layers className="h-4 w-4 text-[rgb(var(--primary))] mr-2" />,
    layout: 'large',
    showInFilter: true
  },
  {
    id: 2,
    name: PROJECT_LABELS.TOOLBOX,
    filterKey: 'tools',
    icon: <ToolCase className="h-4 w-4 text-[rgb(var(--primary))] mr-2" />,
    layout: 'small',
    showInFilter: true
  },
  {
    id: 3,
    name: PROJECT_LABELS.MINI_GAME,
    filterKey: 'games',
    icon: <Gamepad2 className="h-4 w-4 text-[rgb(var(--primary))] mr-2" />,
    layout: 'small',
    showInFilter: true
  },
  {
    id: 4,
    name: PROJECT_LABELS.MINI_EXERCISE,
    filterKey: 'exercises',
    icon: <Code className="h-4 w-4 text-[rgb(var(--primary))] mr-2" />,
    layout: 'small',
    showInFilter: true
  },
  {
    id: 0,
    name: PROJECT_LABELS.HIDDEN,
    filterKey: 'hidden',
    icon: <X className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />,
    layout: 'small',
    showInFilter: false
  }
]

// 定义状态类型
interface AppState {
  allProjects: Project[]
  filteredProjects: Project[]
  loading: boolean
  filterLoading: boolean
  activeFilter: string
  searchQuery: string
  isDropdownOpen: boolean
  isMobile: boolean
  initialLoadComplete: boolean
  userInitiatedFilter: boolean
}

// 定义 action 类型
type AppAction =
  | { type: 'SET_ALL_PROJECTS'; payload: Project[] }
  | { type: 'SET_FILTERED_PROJECTS'; payload: Project[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILTER_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_FILTER'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_DROPDOWN' }
  | { type: 'SET_IS_MOBILE'; payload: boolean }
  | { type: 'SET_INITIAL_LOAD_COMPLETE'; payload: boolean }
  | { type: 'SET_USER_INITIATED_FILTER'; payload: boolean }

// 初始状态
const initialState: AppState = {
  allProjects: [],
  filteredProjects: [],
  loading: false,
  filterLoading: false,
  activeFilter: 'all',
  searchQuery: '',
  isDropdownOpen: false,
  isMobile: false,
  initialLoadComplete: false,
  userInitiatedFilter: false
}

// 组件 Props
interface ProjectClientProps {
  initialProjects: Project[]
}

// Reducer 函数
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_ALL_PROJECTS':
      return { ...state, allProjects: action.payload }
    case 'SET_FILTERED_PROJECTS':
      return { ...state, filteredProjects: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_FILTER_LOADING':
      return { ...state, filterLoading: action.payload }
    case 'SET_ACTIVE_FILTER':
      return { ...state, activeFilter: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'TOGGLE_DROPDOWN':
      return { ...state, isDropdownOpen: !state.isDropdownOpen }
    case 'SET_IS_MOBILE':
      return { ...state, isMobile: action.payload }
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { ...state, initialLoadComplete: action.payload }
    case 'SET_USER_INITIATED_FILTER':
      return { ...state, userInitiatedFilter: action.payload }
    default:
      return state
  }
}

// 防抖函数
const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// 缓存键
const CACHE_KEY = 'projects_cache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24小时

// 缓存函数
const getCachedData = () => {
  if (typeof window === 'undefined') return null

  try {
    const cachedData = localStorage.getItem(CACHE_KEY)
    if (!cachedData) return null

    const { data, timestamp } = JSON.parse(cachedData)
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return data
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

// 设置缓存
const setCachedData = (data: Project[]) => {
  if (typeof window === 'undefined') return

  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

export default function ProjectClient({ initialProjects }: ProjectClientProps) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      dispatch({ type: 'SET_IS_MOBILE', payload: window.innerWidth < 640 })
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const { token } = useUser()

  // API调用函数
  const fetchData = async <T extends Record<string, string | number | boolean | undefined>>(
    url: string,
    params?: T
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const filteredParams = params
        ? Object.fromEntries(Object.entries(params).filter(([value]) => value !== undefined))
        : undefined

      const queryParams = filteredParams
        ? new URLSearchParams(
            Object.entries(filteredParams).map(([k, v]) => [k, String(v)])
          ).toString()
        : ''

      const fullUrl = queryParams ? `${url}?${queryParams}` : url
      const res = await fetch(fullUrl)
      const data = await res.json()
      dispatch({ type: 'SET_LOADING', payload: false })
      return data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      dispatch({ type: 'SET_LOADING', payload: false })
      return { code: 500, data: [] }
    }
  }

  // 获取项目数据 - 优先使用服务端传入的初始数据
  useEffect(() => {
    const getProjects = async () => {
      // 优先使用服务端传入的初始数据
      if (initialProjects && initialProjects.length > 0) {
        const displayProjects = initialProjects.filter((project: Project) => project.type !== 0)
        displayProjects.sort((a: Project, b: Project) => {
          if (a.recommend && !b.recommend) return -1
          if (!a.recommend && b.recommend) return 1
          return 0
        })
        dispatch({ type: 'SET_ALL_PROJECTS', payload: displayProjects })
        dispatch({ type: 'SET_FILTERED_PROJECTS', payload: displayProjects })
        dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true })
      } else {
        // 尝试从缓存获取数据
        const cachedProjects = getCachedData()
        if (cachedProjects) {
          const displayProjects = cachedProjects.filter((project: Project) => project.type !== 0)
          displayProjects.sort((a: Project, b: Project) => {
            if (a.recommend && !b.recommend) return -1
            if (!a.recommend && b.recommend) return 1
            return 0
          })
          dispatch({ type: 'SET_ALL_PROJECTS', payload: displayProjects })
          dispatch({ type: 'SET_FILTERED_PROJECTS', payload: displayProjects })
          dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true })
        }
      }

      // 然后从API获取最新数据
      const res = await fetchData(ENDPOINTS.PROJECTS)
      if (res.code === 200) {
        const displayProjects = res.data.filter((project: Project) => project.type !== 0)
        displayProjects.sort((a: Project, b: Project) => {
          if (a.recommend && !b.recommend) return -1
          if (!a.recommend && b.recommend) return 1
          return 0
        })
        dispatch({ type: 'SET_ALL_PROJECTS', payload: displayProjects })
        dispatch({ type: 'SET_FILTERED_PROJECTS', payload: displayProjects })
        dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true })
        setCachedData(displayProjects)
      }
    }

    getProjects()
  }, [token, initialProjects])

  // 防抖处理搜索
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      let result = [...state.allProjects]

      // 应用类型筛选
      if (state.activeFilter !== 'all') {
        const filterType = PROJECT_TYPES.find(type => type.filterKey === state.activeFilter)
        if (filterType) {
          result = result.filter(item => item.type === filterType.id)
        }
      }

      // 应用搜索筛选
      if (query) {
        const lowerQuery = query.toLowerCase()
        result = result.filter(
          item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.content.toLowerCase().includes(lowerQuery) ||
            item.techs.toLowerCase().includes(lowerQuery)
        )
      }

      // 按推荐状态排序，推荐项目在前
      result.sort((a, b) => {
        if (a.recommend && !b.recommend) return -1
        if (!a.recommend && b.recommend) return 1
        return 0
      })

      dispatch({ type: 'SET_FILTERED_PROJECTS', payload: result })
      dispatch({ type: 'SET_FILTER_LOADING', payload: false }) // 筛选完成，隐藏过渡
    }, 300),
    [state.allProjects, state.activeFilter]
  )

  // 处理筛选变化 - 只有用户主动触发时才显示过渡动画
  const handleFilterChange = useCallback(() => {
    if (state.userInitiatedFilter && state.allProjects.length > 0 && state.initialLoadComplete) {
      dispatch({ type: 'SET_FILTER_LOADING', payload: true }) // 开始筛选，显示过渡
      debouncedSearch(state.searchQuery)
    }
  }, [
    state.searchQuery,
    state.activeFilter,
    debouncedSearch,
    state.allProjects,
    state.initialLoadComplete,
    state.userInitiatedFilter
  ])

  // 监听筛选条件变化
  useEffect(() => {
    handleFilterChange()
  }, [handleFilterChange])

  // 格式化技术栈列表
  const formatTechs = (techs: string) => {
    return techs.split(',').map(tech => tech.trim())
  }

  // 高亮搜索结果中的匹配文本
  const highlightText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>

    const lowerQuery = query.toLowerCase()
    const lowerText = text.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) return <span>{text}</span>

    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)

    return (
      <span>
        {before}
        <span className="bg-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary-foreground))] px-0.5 rounded">
          {match}
        </span>
        {highlightText(after, query)}
      </span>
    )
  }

  // 获取项目类型配置
  const getProjectTypeConfig = (typeId: number): ProjectTypeConfig => {
    return PROJECT_TYPES.find(type => type.id === typeId) || PROJECT_TYPES[0]
  }

  // 渲染项目卡片
  const renderProjectCard = (project: Project, index = 0) => {
    const typeConfig = getProjectTypeConfig(project.type)

    // 大卡片布局 - 仅用于完整项目
    if (typeConfig.layout === 'large') {
      return (
        <motion.div
          key={project.id}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[rgb(var(--border))] hover:shadow-lg hover:border-[rgb(var(--primary)/0.5)] group"
        >
          <Link href={project.url} target="_blank" rel="noopener noreferrer" className="block">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* 图片区域 */}
              <div className="relative h-40 md:h-48 overflow-hidden">
                <motion.div
                  className="w-full h-full"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                >
                  <Image
                    src={project.pic_url}
                    alt={project.title}
                    width={600}
                    height={320}
                    priority={true}
                    loading="eager"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
                    className="object-cover w-full h-full"
                  />
                </motion.div>
                {/* 推荐标签 */}
                <AnimatePresence>
                  {project.recommend && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="absolute top-2 right-2 bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] px-2.5 py-1 rounded-full flex items-center shadow-lg"
                    >
                      <Star className="h-3 w-3 mr-1 fill-[#fbbf24] text-[#fbbf24]" />
                      <span className="text-xs font-bold tracking-wider">推荐</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* 内容区域 */}
              <div className="p-4 md:p-5">
                <div className="flex items-start">
                  <motion.h3
                    className="text-lg font-bold mb-2 text-[rgb(var(--card-foreground))] group-hover:text-[rgb(var(--primary))] transition-colors line-clamp-2 flex-1"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {highlightText(project.title, state.searchQuery)}
                  </motion.h3>
                </div>
                <p className="text-[rgb(var(--muted-foreground))] text-sm mb-3 line-clamp-2">
                  {highlightText(project.content, state.searchQuery)}
                </p>
                <motion.div
                  className="flex flex-wrap gap-1.5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {formatTechs(project.techs).map((tech, idx) => (
                    <motion.span
                      key={idx}
                      variants={tagVariants}
                      whileHover="hover"
                      className={`bg-[rgb(var(--muted))] text-[rgb(var(--primary))] text-xs px-2 py-1 rounded border cursor-default
                        ${
                          state.searchQuery &&
                          tech.toLowerCase().includes(state.searchQuery.toLowerCase())
                            ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]'
                            : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--primary)/0.05)]'
                        }
                        transition-colors`}
                    >
                      {highlightText(tech, state.searchQuery)}
                    </motion.span>
                  ))}
                </motion.div>
              </div>
            </div>
          </Link>
        </motion.div>
      )
    }

    // 小卡片布局 - 用于工具箱、小游戏和小练习
    return (
      <motion.div
        key={project.id}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[rgb(var(--border))] hover:shadow-lg hover:border-[rgb(var(--primary)/0.5)] group"
      >
        <Link
          href={project.url}
          target="_blank"
          rel="noopener"
          className="block h-full"
        >
          <div className="relative h-40 overflow-hidden">
            <motion.div
              className="w-full h-full"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src={project.pic_url}
                alt={project.title}
                width={400}
                height={320}
                priority={true}
                loading="eager"
                className="object-cover w-full h-full"
              />
            </motion.div>
            {/* 推荐标签 */}
            <AnimatePresence>
              {project.recommend && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="absolute top-2 right-2 bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] px-2.5 py-1 rounded-full flex items-center shadow-lg"
                >
                  <Star className="h-3 w-3 mr-1 fill-[#fbbf24] text-[#fbbf24]" />
                  <span className="text-xs font-bold tracking-wider">推荐</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="p-3">
            <div className="flex items-start">
              <motion.h3
                className="text-base font-semibold mb-1.5 text-[rgb(var(--card-foreground))] group-hover:text-[rgb(var(--primary))] transition-colors line-clamp-1 flex-1"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                {highlightText(project.title, state.searchQuery)}
              </motion.h3>
            </div>
            <p className="text-[rgb(var(--muted-foreground))] text-xs mb-2.5 line-clamp-2">
              {highlightText(project.content, state.searchQuery)}
            </p>
            <motion.div
              className="flex flex-wrap gap-1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {formatTechs(project.techs).map((tech, idx) => (
                <motion.span
                  key={idx}
                  variants={tagVariants}
                  whileHover="hover"
                  className={`bg-[rgb(var(--muted))] text-[rgb(var(--primary))] text-xs px-1.5 py-0.5 rounded border cursor-default
                    ${
                      state.searchQuery &&
                      tech.toLowerCase().includes(state.searchQuery.toLowerCase())
                        ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]'
                        : 'border-[rgb(var(--border))]'
                    }
                  `}
                >
                  {highlightText(tech, state.searchQuery)}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </Link>
      </motion.div>
    )
  }

  // 获取当前筛选器的配置
  const getCurrentFilterConfig = () => {
    if (state.activeFilter === 'all') {
      return {
        label: '全部',
        icon: <Layers className="h-4 w-4 text-[rgb(var(--primary))]" />
      }
    }

    const typeConfig = PROJECT_TYPES.find(type => type.filterKey === state.activeFilter)
    return typeConfig
      ? { label: typeConfig.name, icon: typeConfig.icon }
      : { label: '全部', icon: <Layers className="h-4 w-4 text-[rgb(var(--primary))]" /> }
  }

  // 渲染项目分组
  const renderProjectGroup = (typeId: number, projects: Project[]) => {
    if (projects.length === 0) return null

    const typeConfig = getProjectTypeConfig(typeId)

    return (
      <motion.div
        key={typeId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.h2
          className="text-xl font-bold ml-2 mt-2 mb-2 text-[rgb(var(--foreground))] flex items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {typeConfig.icon}
          <span className="ml-2">{typeConfig.name}</span>
          <motion.span
            className="ml-2 text-sm text-[rgb(var(--muted-foreground))] font-normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            ({projects.length})
          </motion.span>
        </motion.h2>
        {typeConfig.layout === 'large' ? (
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {projects.map((project, index) => renderProjectCard(project, index))}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {projects.map((project, index) => renderProjectCard(project, index))}
          </motion.div>
        )}
      </motion.div>
    )
  }

  // 渲染筛选后的内容
  const renderFilteredContent = () => {
    if (state.filteredProjects.length === 0) {
      return (
        <motion.div
          className="text-center py-12 text-[rgb(var(--muted-foreground))]"
          variants={emptyStateVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="mb-4 flex justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search className="h-16 w-16 text-[rgb(var(--muted))]" />
          </motion.div>
          <motion.h3
            className="text-xl font-medium mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            未找到相关项目
          </motion.h3>
          <motion.p
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            尝试使用不同的搜索关键词，或清除筛选条件查看全部项目
          </motion.p>
          <motion.button
            onClick={() => {
              dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
              dispatch({ type: 'SET_ACTIVE_FILTER', payload: 'all' })
            }}
            className="mt-6 px-6 py-2.5 bg-[rgb(var(--primary)/0.1)] hover:bg-[rgb(var(--primary)/0.2)] text-[rgb(var(--primary))] rounded-lg transition-colors font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            查看全部项目
          </motion.button>
        </motion.div>
      )
    }

    if (state.activeFilter === 'all') {
      // 显示所有分组
      return PROJECT_TYPES.filter(type => type.showInFilter).map((type, index) => {
        const projects = state.filteredProjects.filter(project => project.type === type.id)
        return renderProjectGroup(type.id, projects)
      })
    } else {
      // 显示单个筛选类型
      const filterType = PROJECT_TYPES.find(type => type.filterKey === state.activeFilter)
      if (!filterType) return null

      return renderProjectGroup(filterType.id, state.filteredProjects)
    }
  }

  // 判断是否需要显示大卡片骨架屏
  const shouldShowLargeSkeleton = () => {
    return state.activeFilter === 'all' || state.activeFilter === 'projects'
  }

  // 判断是否需要显示小卡片骨架屏
  const shouldShowSmallSkeleton = () => {
    return (
      state.activeFilter === 'all' || ['tools', 'games', 'exercises'].includes(state.activeFilter)
    )
  }

  // 渲染筛选过渡骨架屏
  const renderFilterSkeleton = () => {
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {shouldShowLargeSkeleton() &&
          [1, 2].map((item, index) => (
            <motion.div
              key={`filter-large-${item}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-[rgb(var(--border))] pulse-skeleton"
              style={{ opacity: 0.6 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-40 md:h-48 overflow-hidden">
                  <div className="absolute inset-0 pulse-skeleton"></div>
                </div>
                <div className="p-4 md:p-5">
                  <div className="h-6 bg-[rgb(var(--muted))] rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-[rgb(var(--muted))] rounded w-full mb-2"></div>
                  <div className="h-4 bg-[rgb(var(--muted))] rounded w-2/3 mb-3"></div>
                  <div className="flex flex-wrap gap-1.5">
                    <div className="h-5 bg-[rgb(var(--muted))] rounded w-16"></div>
                    <div className="h-5 bg-[rgb(var(--muted))] rounded w-20"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

        {shouldShowSmallSkeleton() && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item, index) => (
              <motion.div
                key={`filter-small-${item}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.08 }}
                className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[rgb(var(--border))] pulse-skeleton"
                style={{ opacity: 0.6 }}
              >
                <div className="relative h-40 overflow-hidden">
                  <div className="absolute inset-0 pulse-skeleton"></div>
                </div>
                <div className="p-3">
                  <div className="h-5 bg-[rgb(var(--muted))] rounded w-3/4 mb-1.5"></div>
                  <div className="h-3 bg-[rgb(var(--muted))] rounded w-full mb-1"></div>
                  <div className="h-3 bg-[rgb(var(--muted))] rounded w-2/3 mb-2.5"></div>
                  <div className="flex flex-wrap gap-1">
                    <div className="h-4 bg-[rgb(var(--muted))] rounded w-12"></div>
                    <div className="h-4 bg-[rgb(var(--muted))] rounded w-16"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    )
  }

  const currentFilter = getCurrentFilterConfig()

  return (
    <div>
      <div className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] overflow-hidden">
        <BgOverlay />

        <motion.main
          className="flex-1 w-full max-w-7xl mx-auto px-4 py-1 lg:py-3 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 搜索和筛选栏 */}
          <motion.div
            className="mb-2 lg:mb-4 flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* 搜索栏 */}
            <div className="relative flex-1 max-w-[94%] min-w-[140px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted-foreground))] h-4 w-4" />
              <input
                type="text"
                placeholder="搜索项目标题、内容或技术栈..."
                value={state.searchQuery}
                onChange={e => {
                  dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })
                  dispatch({ type: 'SET_USER_INITIATED_FILTER', payload: true })
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg text-[rgb(var(--card-foreground))] placeholder-[rgb(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.5)] transition-all"
                style={{ height: '40px' }}
              />
              <AnimatePresence>
                {state.searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors"
                    aria-label="清除搜索"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* 下拉筛选器 */}
            <div className="relative ml-2 shrink-0">
              <motion.button
                onClick={() => dispatch({ type: 'TOGGLE_DROPDOWN' })}
                className="flex items-center justify-center px-3 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg text-[rgb(var(--card-foreground))] hover:bg-[rgb(var(--muted))] transition-all"
                aria-label={currentFilter.label}
                style={{ height: '40px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center">
                  {currentFilter.icon}
                  {!state.isMobile && <span className="ml-1">{currentFilter.label}</span>}
                </div>
                <motion.div
                  animate={{ rotate: state.isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown
                    className={`h-4 w-4 text-[rgb(var(--muted-foreground))] ml-${
                      state.isMobile ? 0 : 1
                    }`}
                  />
                </motion.div>
              </motion.button>

              {/* 下拉列表 */}
              <AnimatePresence>
                {state.isDropdownOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute z-20 top-full right-0 mt-1 bg-[rgb(var(--card))] backdrop-blur-sm rounded-lg shadow-md border border-[rgb(var(--border))] overflow-hidden min-w-[140px]"
                  >
                    {[
                      {
                        type: 'all',
                        label: '全部',
                        icon: <Layers className="h-4 w-4 mr-2 text-[rgb(var(--primary))]" />
                      },
                      ...PROJECT_TYPES.filter(type => type.showInFilter).map(type => ({
                        type: type.filterKey,
                        label: type.name,
                        icon: type.icon
                      }))
                    ].map((item, index) => (
                      <motion.button
                        key={item.type}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          dispatch({ type: 'SET_ACTIVE_FILTER', payload: item.type })
                          dispatch({ type: 'TOGGLE_DROPDOWN' })
                          dispatch({ type: 'SET_USER_INITIATED_FILTER', payload: true })
                        }}
                        className={`w-full flex items-center px-4 py-2.5 text-left transition-all
                          ${
                            state.activeFilter === item.type
                              ? 'bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] border-l-2 border-[rgb(var(--primary))]'
                              : 'text-[rgb(var(--popover-foreground))] hover:bg-[rgb(var(--muted))] border-l-2 border-transparent'
                          }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {item.icon}
                        {item.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {state.loading ? (
              // 初始加载骨架屏
              <motion.div
                key="loading"
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {shouldShowLargeSkeleton() &&
                  [1, 2, 3].map((item, index) => (
                    <motion.div
                      key={`large-${item}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[rgb(var(--border))] pulse-skeleton"
                      style={{ opacity: 0.7 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="relative h-40 md:h-48 overflow-hidden">
                          <div className="absolute inset-0 pulse-skeleton"></div>
                        </div>
                        <div className="p-4 md:p-5">
                          <div className="h-6 bg-[rgb(var(--muted))] rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-[rgb(var(--muted))] rounded w-full mb-2"></div>
                          <div className="h-4 bg-[rgb(var(--muted))] rounded w-full mb-3"></div>
                          <div className="flex flex-wrap gap-1.5">
                            <div className="h-5 bg-[rgb(var(--muted))] rounded w-16"></div>
                            <div className="h-5 bg-[rgb(var(--muted))] rounded w-20"></div>
                            <div className="h-5 bg-[rgb(var(--muted))] rounded w-14"></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                {shouldShowSmallSkeleton() && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((item, index) => (
                      <motion.div
                        key={`small-${item}`}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.08 }}
                        className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[rgb(var(--border))] pulse-skeleton"
                        style={{ opacity: 0.7 }}
                      >
                        <div className="relative h-40 overflow-hidden">
                          <div className="absolute inset-0 pulse-skeleton"></div>
                        </div>
                        <div className="p-3">
                          <div className="h-5 bg-[rgb(var(--muted))] rounded w-3/4 mb-1.5"></div>
                          <div className="h-3 bg-[rgb(var(--muted))] rounded w-full mb-1"></div>
                          <div className="h-3 bg-[rgb(var(--muted))] rounded w-2/3 mb-2.5"></div>
                          <div className="flex flex-wrap gap-1">
                            <div className="h-4 bg-[rgb(var(--muted))] rounded w-12"></div>
                            <div className="h-4 bg-[rgb(var(--muted))] rounded w-16"></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : state.filterLoading ? (
              // 筛选过渡骨架屏
              renderFilterSkeleton()
            ) : (
              // 实际内容
              <motion.div
                key="content"
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {renderFilteredContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  )
}
