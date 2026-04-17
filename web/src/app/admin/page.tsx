'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import BlogChart from '@/components/charts/BlogChart'
import TagChart from '@/components/charts/TagChart'
import TypeChart from '@/components/charts/TypeChart'
import VisitorMap from '@/components/charts/VisitorMap'
import { ENDPOINTS } from '@/lib/api'
import { BarChart3, FileText, ThumbsUp, MessageSquare, Eye, MapPin } from 'lucide-react'
import apiClient from '@/lib/utils' // 导入axios实例

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

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
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

// 定义类型
interface StatData {
  title: string
  value: number
  icon: React.ReactNode
}

export default function DashboardPage() {
  // 状态管理 - 默认选中访问量卡片（索引0）
  const [stats, setStats] = useState<StatData[]>([
    { title: '总访问量', value: 0, icon: <Eye className="h-5 w-5 text-[rgb(var(--primary))]" /> },
    { title: '博客总数', value: 0, icon: <FileText className="h-5 w-5 text-[rgb(var(--primary))]" /> },
    { title: '点赞数', value: 0, icon: <ThumbsUp className="h-5 w-5 text-[rgb(var(--primary))]" /> },
    { title: '评论数', value: 0, icon: <MessageSquare className="h-5 w-5 text-[rgb(var(--primary))]" /> }
  ])
  const [selectedCard, setSelectedCard] = useState(0) // 默认选中访问量卡片
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [screenWidth, setScreenWidth] = useState<number | null>(null) // 初始为null，表示未获取到实际宽度

  // 检测客户端环境并设置初始屏幕宽度
  useEffect(() => {
    setIsClient(true)
    // 仅在客户端设置屏幕宽度
    setScreenWidth(window.innerWidth)

    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // API调用函数
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
      return { code: 500, data: 0 }
    }
  }

  // 获取统计数据
  const getCountList = async () => {
    try {
      setLoading(true)

      // 并行请求所有统计数据
      const [blogRes, viewRes, appreciateRes, commentRes] = await Promise.all([
        fetchData(ENDPOINTS.ADMIN.GETBLOGCOUNT),
        fetchData(ENDPOINTS.GET_VISIT_COUNT),
        fetchData(ENDPOINTS.ADMIN.GETBLOGLIKES),
        fetchData(ENDPOINTS.ADMIN.GETCOMMENTCOUNT)
      ])

      setStats([
        {
          title: '总访问量',
          value: viewRes.code === 200 ? viewRes.data : 0,
          icon: <Eye className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '博客总数',
          value: blogRes.code === 200 ? blogRes.data : 0,
          icon: <FileText className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '点赞数',
          value: appreciateRes.code === 200 ? appreciateRes.data : 0,
          icon: <ThumbsUp className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '评论数',
          value: commentRes.code === 200 ? commentRes.data : 0,
          icon: <MessageSquare className="h-5 w-5 text-[rgb(var(--primary))]" />
        }
      ])
    } catch (error) {
      console.log('Failed to fetch statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getCountList()
  }, [])

  // 选择卡片的处理函数
  const selectCard = (id: number) => {
    setSelectedCard(id)
    console.log(id)
  }

  // 根据屏幕宽度确定图表高度
  const getChartHeight = () => {
    if (!screenWidth) return 350 // 默认高度，直到获取到实际屏幕宽度
    if (screenWidth < 640) return 250
    if (screenWidth < 1024) return 300
    return 350
  }

  // 小图表高度
  const getSmallChartHeight = () => {
    if (!screenWidth) return 300 // 默认高度，直到获取到实际屏幕宽度
    if (screenWidth < 640) return 200
    if (screenWidth < 1024) return 250
    return 300
  }

  // 生成骨架屏元素
  const renderSkeleton = (index: number) => {
    // 使用默认值或根据实际屏幕尺寸调整
    const currentWidth = screenWidth || 1200
    const iconSize = currentWidth < 640 ? 'h-4 w-4' : 'h-5 w-5'
    const titleWidth = currentWidth < 640 ? 'w-20' : 'w-24'
    const valueWidth = currentWidth < 640 ? 'w-28' : 'w-32'
    const valueHeight = currentWidth < 640 ? 'h-7' : 'h-8'

    // 根据索引获取对应图标
    const getIcon = () => {
      switch (index) {
        case 0:
          return <Eye className={iconSize} />
        case 1:
          return <FileText className={iconSize} />
        case 2:
          return <ThumbsUp className={iconSize} />
        case 3:
          return <MessageSquare className={iconSize} />
        default:
          return null
      }
    }

    return (
      <div className="space-y-3 animate-pulse h-full flex flex-col justify-center">
        <div
          className={`${iconSize} bg-[rgb(var(--muted))] rounded ${
            index === selectedCard ? 'text-[rgb(var(--primary))]' : ''
          }`}
        >
          {getIcon()}
        </div>
        <div className={`h-4 bg-[rgb(var(--muted))] rounded ${titleWidth}`}></div>
        <div className={`${valueHeight} bg-[rgb(var(--muted))] rounded ${valueWidth} mt-auto`}></div>
      </div>
    )
  }

  // 图表容器高度，避免布局抖动
  const chartContainerStyle = {
    height: getChartHeight(),
    minHeight: getChartHeight()
  }

  const smallChartContainerStyle = {
    height: getSmallChartHeight(),
    minHeight: getSmallChartHeight()
  }

  return (
    <motion.div 
      className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden" 
      style={{ background: 'linear-gradient(to bottom, rgb(var(--bg)))' }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 背景装饰 - 已移除，保持纯白背景 */}

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 py-2 relative z-10">
        {/* 顶部统计卡片 - 响应式网格布局 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          {stats.map((item, index) => {
            return (
              <motion.div
                key={index}
                onClick={() => selectCard(index)}
                className={`bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  loading
                    ? index === selectedCard
                      ? 'ring-2 ring-[rgb(var(--primary))] border-[rgb(var(--primary))]/30'
                      : 'hover:border-[rgb(var(--border))]'
                    : selectedCard === index
                    ? 'ring-2 ring-[rgb(var(--primary))]'
                    : 'hover:border-[rgb(var(--border))]'
                }`}
                style={{ minHeight: (screenWidth || 1200) < 640 ? '120px' : '140px' }}
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  renderSkeleton(index)
                ) : (
                  <div className="h-full flex flex-col justify-between">
                    <div>{item.icon}</div>
                    <div className="mt-2">
                      <p className="text-[rgb(var(--text))] text-sm sm:text-base">{item.title}</p>
                      <h2 className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-[rgb(var(--primary))]">
                        {item.value.toLocaleString()}
                      </h2>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* 主要图表区域 */}
        <motion.div 
          className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-6 mb-4 md:mb-6 transition-all duration-300 hover:shadow-lg"
          variants={fadeInUpVariants}
        >
          <div className="flex items-center mb-4 sm:mb-6">
            <BarChart3 className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--primary))]">网站数据统计</h2>
          </div>
          <div className="w-full overflow-hidden" style={chartContainerStyle}>
            {screenWidth !== null && ( // 只在获取到实际屏幕宽度后渲染图表
              <BlogChart psMsg={selectedCard} style={{ width: '100%', height: '100%' }} />
            )}
          </div>
        </motion.div>

        {/* 三个小图表区域 - 响应式布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10">
          <motion.div 
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-300 hover:shadow-lg"
            variants={fadeInUpVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center mb-4 sm:mb-6">
              <FileText className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
              <h2 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))]">标签分布</h2>
            </div>
            <div className="w-full overflow-hidden" style={smallChartContainerStyle}>
              {screenWidth !== null && <TagChart style={{ width: '100%', height: '100%' }} />}
            </div>
          </motion.div>

          <motion.div 
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-300 hover:shadow-lg"
            variants={fadeInUpVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center mb-4 sm:mb-6">
              <FileText className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
              <h2 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))]">类型分布</h2>
            </div>
            <div className="w-full overflow-hidden" style={smallChartContainerStyle}>
              {screenWidth !== null && <TypeChart style={{ width: '100%', height: '100%' }} />}
            </div>
          </motion.div>

          <motion.div 
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-300 hover:shadow-lg"
            variants={fadeInUpVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center mb-4 sm:mb-6">
              <MapPin className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
              <h2 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))]">访问者分布</h2>
            </div>
            <div className="w-full overflow-hidden" style={smallChartContainerStyle}>
              {screenWidth !== null && <VisitorMap style={{ width: '100%', height: '100%' }} />}
            </div>
          </motion.div>
        </div>
      </main>
    </motion.div>
  )
}