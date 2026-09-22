'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ENDPOINTS } from '@/lib/api'
import { BarChart3, FileText, ThumbsUp, MessageSquare, Eye, MapPin, Globe2, List, Trash2 } from 'lucide-react'
import { API_CODE } from '@/lib/constants'
import apiClient from '@/lib/utils' // 导入axios实例
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { alertSuccess } from '@/lib/Alert'

// 图表组件懒加载（echarts 体积大，避免进首屏）
const BlogChart = dynamic(() => import('@/components/charts/BlogChart').then((m) => m.default), { ssr: false })
const TagChart = dynamic(() => import('@/components/charts/TagChart').then((m) => m.default), { ssr: false })
const TypeChart = dynamic(() => import('@/components/charts/TypeChart').then((m) => m.default), { ssr: false })
const VisitorMap = dynamic(() => import('@/components/charts/VisitorMap').then((m) => m.default), { ssr: false })
const VisitorWorldMap = dynamic(() => import('@/components/charts/VisitorWorldMap').then((m) => m.default), { ssr: false })

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
  const [visitorOverview, setVisitorOverview] = useState<any>(null)
  const [visitorIpList, setVisitorIpList] = useState<any[]>([])
  const [visitorPageSize] = useState(20)
  const [visitorPage, setVisitorPage] = useState(1)
  const [visitorTotal, setVisitorTotal] = useState(0)
  const [visitorKeyword, setVisitorKeyword] = useState('')
  const [visitorSortBy, setVisitorSortBy] = useState('lastVisitTime')
  const [visitorOrder, setVisitorOrder] = useState<'asc' | 'desc'>('desc')
  const [visitorRefreshKey, setVisitorRefreshKey] = useState(0)
  const [visitorClearConfirm, setVisitorClearConfirm] = useState(false)

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
          value: viewRes.code === API_CODE.SUCCESS ? viewRes.data : 0,
          icon: <Eye className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '博客总数',
          value: blogRes.code === API_CODE.SUCCESS ? blogRes.data : 0,
          icon: <FileText className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '点赞数',
          value: appreciateRes.code === API_CODE.SUCCESS ? appreciateRes.data : 0,
          icon: <ThumbsUp className="h-5 w-5 text-[rgb(var(--primary))]" />
        },
        {
          title: '评论数',
          value: commentRes.code === API_CODE.SUCCESS ? commentRes.data : 0,
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

  const fetchVisitorOverview = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.ADMIN.VISITOR_OVERVIEW)
      if (res.data?.code === API_CODE.SUCCESS) setVisitorOverview(res.data.data)
    } catch { /* ignore */ }
  }

  const fetchVisitorIpList = async () => {
    try {
      const params: Record<string, any> = {
        page: visitorPage,
        pageSize: visitorPageSize,
        sortBy: visitorSortBy,
        order: visitorOrder
      }
      if (visitorKeyword.trim()) params.keyword = visitorKeyword.trim()
      const res = await apiClient.get(ENDPOINTS.ADMIN.VISITOR_IP_LIST, { params })
      if (res.data?.code === API_CODE.SUCCESS) {
        setVisitorIpList(res.data.data?.content ?? [])
        setVisitorTotal(res.data.data?.totalElements ?? 0)
      }
    } catch { /* ignore */ }
  }

  const resetVisitorPage = () => setVisitorPage(1)

  // 筛选/排序/分页状态变化时重新请求 IP 明细
  useEffect(() => {
    fetchVisitorIpList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorPage, visitorKeyword, visitorSortBy, visitorOrder, visitorRefreshKey])

  const handleVisitorClear = async () => {
    try {
      await apiClient.post(ENDPOINTS.ADMIN.VISITOR_CLEAR)
      alertSuccess('访客 IP 数据已清理')
      fetchVisitorOverview()
      // 触发 IP 明细与世界地图重新拉取（清理后应反映为空）
      resetVisitorPage()
      setVisitorRefreshKey((k) => k + 1)
    } catch { /* ignore */ }
    setVisitorClearConfirm(false)
  }

  // 客户端就绪后拉取访客概览
  useEffect(() => {
    if (screenWidth !== null) {
      fetchVisitorOverview()
    }
  }, [screenWidth])

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
                className={`bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-5 md:p-6 cursor-pointer transition-all duration-150 hover:shadow-lg hover:border-[rgb(var(--primary))]/30 ${
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
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-150 hover:shadow-lg"
            variants={fadeInUpVariants}
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
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-sm border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-150 hover:shadow-lg"
            variants={fadeInUpVariants}
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
            className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] p-4 sm:p-6 transition-all duration-150 hover:shadow-lg"
            variants={fadeInUpVariants}
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

        {/* 访客 IP 分布（全球）卡片 - 独立整行全宽 */}
        <motion.div
          className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-xl shadow-lg border border-[rgb(var(--border))] p-4 sm:p-6 mb-6 md:mb-10 transition-all duration-150 hover:shadow-lg"
          variants={fadeInUpVariants}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center">
              <Globe2 className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
              <h2 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))]">访客 IP 分布（全球）</h2>
            </div>
            <button
              onClick={() => setVisitorClearConfirm(true)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-red-500 hover:border-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> 清理数据
            </button>
          </div>
          {visitorOverview && (
            <div className="flex flex-wrap gap-4 mb-3 text-sm">
              <span className="text-[rgb(var(--muted-foreground))]">访客IP(UV): <b className="text-[rgb(var(--primary))]">{visitorOverview.uv}</b></span>
              <span className="text-[rgb(var(--muted-foreground))]">访问次数(PV): <b className="text-[rgb(var(--primary))]">{visitorOverview.pv}</b></span>
              <span className="text-[rgb(var(--muted-foreground))]">未知区域: <b className="text-[rgb(var(--primary))]">{visitorOverview.unknownRegion}</b> ({visitorOverview.unknownRegionPercent}%)</span>
            </div>
          )}
          <div className="w-full overflow-hidden" style={chartContainerStyle}>
            {screenWidth !== null && <VisitorWorldMap style={{ width: '100%', height: '100%' }} refreshKey={visitorRefreshKey} />}
          </div>

          {/* IP 明细：筛选 + 排序 + 分页 */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-[rgb(var(--primary))]" />
                <h3 className="text-sm font-semibold text-[rgb(var(--primary))]">IP 明细（共 {visitorTotal} 条）</h3>
              </div>
              <div className="flex-1 min-w-[160px]">
                <input
                  value={visitorKeyword}
                  onChange={(e) => { setVisitorKeyword(e.target.value); resetVisitorPage() }}
                  placeholder="搜索国家/省份/城市/IP…"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-transparent text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted-foreground))] focus:outline-none focus:border-[rgb(var(--primary))]"
                />
              </div>
              <select
                value={visitorSortBy}
                onChange={(e) => { setVisitorSortBy(e.target.value); resetVisitorPage() }}
                className="text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-transparent text-[rgb(var(--text))] focus:outline-none focus:border-[rgb(var(--primary))]"
              >
                <option value="lastVisitTime">按最近访问</option>
                <option value="visitCount">按访问次数</option>
              </select>
              <button
                onClick={() => { setVisitorOrder((o) => (o === 'asc' ? 'desc' : 'asc')); resetVisitorPage() }}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--primary))] hover:border-[rgb(var(--primary))] transition-colors"
              >
                {visitorOrder === 'asc' ? '升序 ↑' : '降序 ↓'}
              </button>
            </div>

            {visitorIpList.length > 0 ? (
              <>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-xs text-[rgb(var(--muted-foreground))]">
                    <thead>
                      <tr className="border-b border-[rgb(var(--border))] text-left">
                        <th className="py-1 pr-2">IP</th><th className="py-1 pr-2">国家</th><th className="py-1 pr-2">省份</th>
                        <th className="py-1 pr-2">城市</th><th className="py-1 pr-2">次数</th><th className="py-1">最近访问</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitorIpList.map((v: any) => (
                        <tr key={v.id} className="border-b border-[rgb(var(--border))]/50">
                          <td className="py-1 pr-2 font-mono">{v.ip}</td>
                          <td className="py-1 pr-2">{v.country ?? '-'}</td>
                          <td className="py-1 pr-2">{v.province ?? '-'}</td>
                          <td className="py-1 pr-2">{v.city ?? '-'}</td>
                          <td className="py-1 pr-2">{v.visitCount}</td>
                          <td className="py-1">{v.lastVisitTime ? new Date(v.lastVisitTime).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-[rgb(var(--muted-foreground))]">
                  <span>第 {visitorPage} 页</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVisitorPage((p) => Math.max(1, p - 1))}
                      disabled={visitorPage <= 1}
                      className="px-3 py-1 rounded-lg border border-[rgb(var(--border))] disabled:opacity-40 hover:text-[rgb(var(--primary))] hover:border-[rgb(var(--primary))] transition-colors"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setVisitorPage((p) => p + 1)}
                      disabled={visitorPage * visitorPageSize >= visitorTotal}
                      className="px-3 py-1 rounded-lg border border-[rgb(var(--border))] disabled:opacity-40 hover:text-[rgb(var(--primary))] hover:border-[rgb(var(--primary))] transition-colors"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[rgb(var(--muted-foreground))] py-4 text-center">暂无访客 IP 数据</p>
            )}
          </div>
        </motion.div>

        {/* 清理访客数据确认对话框 */}
        <ConfirmDialog
          isOpen={visitorClearConfirm}
          title="确认清理"
          message="确定清理全部访客 IP 数据？此操作不可撤销。"
          confirmText="确认清理"
          cancelText="取消"
          variant="danger"
          onConfirm={handleVisitorClear}
          onCancel={() => setVisitorClearConfirm(false)}
        />
      </main>
    </motion.div>
  )
}