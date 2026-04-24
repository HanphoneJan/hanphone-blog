'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBilibili } from '@fortawesome/free-brands-svg-icons'
import { Mail, Eye, Clock, Rss } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeProvider'
import { FOOTER_CONFIG, ROUTES, API_CODE } from '@/lib/constants'
import { FOOTER_LABELS } from '@/lib/labels'

// 定义接口返回数据类型
interface VisitCountResponse {
  flag: boolean
  code: number
  message: string
  data: number
}

const SITE_START_DATE = process.env.NEXT_PUBLIC_SITE_START_DATE

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const years = Math.floor(days / 365)

  const remainDays = days % 365
  const remainHours = hours % 24
  const remainMinutes = minutes % 60
  const remainSeconds = seconds % 60

  const parts: string[] = []
  if (years > 0) parts.push(`${years}年`)
  if (remainDays > 0) parts.push(`${remainDays}天`)
  if (remainHours > 0 || parts.length === 0) parts.push(`${remainHours}小时`)
  if (remainMinutes > 0 || parts.length === 0) parts.push(`${remainMinutes}分`)
  parts.push(`${remainSeconds}秒`)

  return parts.join(' ')
}

// 从完整 uptime 字符串中提取“年+天”部分
function formatUptimeDisplay(uptime: string): string {
  const yearMatch = uptime.match(/(\d+)年/)
  const dayMatch = uptime.match(/(\d+)天/)
  const years = yearMatch ? yearMatch[1] : ''
  const days = dayMatch ? dayMatch[1] : '0'
  if (years) {
    return `${years}年${days}天`
  }
  return `${days}天`
}

const Footer: React.FC = () => {
  const { theme } = useTheme()
  const [totalVisitCount, setTotalVisitCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [uptime, setUptime] = useState('')

  useEffect(() => {
    const fetchVisitCount = async (retryCount = 0): Promise<void> => {
      try {
        setLoading(true)
        const response = await apiClient.get<VisitCountResponse>(ENDPOINTS.GET_VISIT_COUNT, {
          timeout: 30000,
        })

        if (response.data.flag && response.data.code === API_CODE.SUCCESS) {
          setTotalVisitCount(response.data.data)
          setError(false)
        } else {
          console.error('获取访问量失败:', response.data.message)
          setError(true)
        }
      } catch (err) {
        if (retryCount < 2) {
          console.warn(`访问量请求失败，第 ${retryCount + 1} 次重试...`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
          return fetchVisitCount(retryCount + 1)
        }
        console.error('Failed to fetch visit count:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchVisitCount()
  }, [])

  useEffect(() => {
    if (!SITE_START_DATE) return

    const start = new Date(SITE_START_DATE).getTime()
    if (isNaN(start)) return

    const update = () => {
      const now = Date.now()
      const diff = now - start
      setUptime(diff > 0 ? formatDuration(diff) : '')
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer className="z-5 relative py-8 mt-3 lg:mt-6 bg-[rgb(var(--bg))] border-t border-[rgb(var(--border))]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 主要内容区域 - 采用响应式网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mb-4">
          {/* 二维码区域 */}
          <div className="md:col-span-2 flex flex-col items-center md:items-start">
            <div className="bg-card p-2 rounded-lg shadow-lg mb-2 transform transition-transform duration-300 hover:scale-105">
              <Image
                src={FOOTER_CONFIG.QR_IMAGE}
                alt={FOOTER_LABELS.SCAN_QR}
                className="qr-code"
                width={140}
                height={140}
                sizes="140px"
                priority={true}
              />
            </div>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-1 text-center md:text-left">
              {FOOTER_LABELS.SCAN_QR}
            </p>
          </div>

          {/* 联系我区域 */}
          <div className="md:col-span-3 flex flex-col">
            <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-[rgb(var(--border))] relative after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-12 after:bg-[rgb(var(--primary))] text-[rgb(var(--primary))]">
              {FOOTER_LABELS.CONTACT_ME}
            </h4>
            <div className="flex flex-col h-full justify-between">
              <div className="flex flex-wrap gap-3 mt-2">
                <a
                  href={FOOTER_CONFIG.GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))]"
                  aria-label="GitHub"
                >
                  <FontAwesomeIcon icon={faGithub} className="h-4 w-4 text-[rgb(var(--text))]" />
                </a>
                <a
                  href={FOOTER_CONFIG.BILIBILI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))]"
                  aria-label="Bilibili"
                >
                  <FontAwesomeIcon icon={faBilibili} className="h-4 w-4 text-pink-400" />
                </a>
                <Link
                  href="/rss"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  aria-label="RSS订阅"
                  title="RSS订阅"
                >
                  <Rss className="h-4 w-4 text-orange-500" />
                </Link>
                <a
                  href={`mailto:${FOOTER_CONFIG.EMAIL}`}
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))]"
                  aria-label="邮箱联系"
                  title={FOOTER_CONFIG.EMAIL}
                >
                  <Mail className="h-4 w-4 text-[rgb(var(--text))]" />
                </a>
              </div>
            </div>
          </div>

          {/* 博客简介区域 */}
          <div className="md:col-span-4">
            <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-[rgb(var(--border))] relative after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-12 after:bg-[rgb(var(--primary))] text-[rgb(var(--primary))]">
              {FOOTER_LABELS.BLOG_INTRO}
            </h4>
            <p className="text-sm leading-6 mb-4 text-[rgb(var(--text))] whitespace-pre-line">
              {FOOTER_LABELS.BLOG_INTRO_DESC}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="px-3 py-1 rounded-full text-xs bg-[rgb(var(--card))] text-[rgb(var(--text))] border border-[rgb(var(--border))]">
                {FOOTER_LABELS.TAG_FULLSTACK}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-[rgb(var(--card))] text-[rgb(var(--text))] border border-[rgb(var(--border))]">
                {FOOTER_LABELS.TAG_TECH}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-[rgb(var(--card))] text-[rgb(var(--text))] border border-[rgb(var(--border))]">
                {FOOTER_LABELS.TAG_LIFE}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-[rgb(var(--card))] text-[rgb(var(--text))] border border-[rgb(var(--border))]">
                {FOOTER_LABELS.TAG_PRACTICE}
              </span>
            </div>
          </div>

          {/* 访问统计区域 */}
          <div className="md:col-span-3">
            <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-[rgb(var(--border))] relative after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-12 after:bg-[rgb(var(--primary))] text-[rgb(var(--primary))]">
              {FOOTER_LABELS.SITE_STATS}
            </h4>
            <div className="flex items-stretch rounded-xl border border-[rgb(var(--border))] shadow-sm hover:shadow-md transition-all duration-300 bg-[rgb(var(--card))] overflow-hidden">
              {/* 左侧：访问量 */}
              <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 group">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[rgb(var(--primary))]/80 to-[rgb(var(--primary-hover))]/80">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                {loading ? (
                  <div className="h-6 w-20 bg-gradient-to-r from-[rgb(var(--card))] to-[rgb(var(--hover))] rounded-md animate-pulse"></div>
                ) : error ? (
                  <span className="text-sm text-[rgb(var(--text-muted))]">--</span>
                ) : (
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))]">
                    {totalVisitCount?.toLocaleString()}
                  </span>
                )}
                <span className="text-xs font-medium text-[rgb(var(--text-muted))]">总访问量</span>
              </div>

              {/* 分隔线 */}
              <div className="w-px bg-[rgb(var(--border))] my-2"></div>

              {/* 右侧：运行时间 */}
              {uptime ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[rgb(var(--color-2))]">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-baseline gap-1 flex-wrap justify-center">
                    <span className="text-xl font-bold text-[rgb(var(--color-2))]">
                      {formatUptimeDisplay(uptime)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[rgb(var(--text-muted))]">已运行</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] flex items-center justify-center">
                    <Clock className="h-4 w-4 text-[rgb(var(--text-muted))] animate-pulse" />
                  </div>
                  <span className="text-xs text-[rgb(var(--text-muted))]">加载中...</span>
                  <span className="text-xs text-[rgb(var(--text-muted))]">已运行</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="my-6 opacity-60 border-t border-[rgb(var(--border))]"></div>

        {/* 底部信息区域 */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-center md:text-left text-[rgb(var(--text-muted))]">
            {FOOTER_LABELS.COPYRIGHT(new Date().getFullYear())}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[rgb(var(--text-muted))]">
            <Link href={ROUTES.TERMS} className="transition-colors duration-300 hover:text-[rgb(var(--primary))]">
              {FOOTER_LABELS.TERMS}
            </Link>
            <Link href={ROUTES.PRIVACY} className="transition-colors duration-300 hover:text-[rgb(var(--primary))]">
              {FOOTER_LABELS.PRIVACY}
            </Link>
            <a
              href={FOOTER_CONFIG.ICP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-300 hover:text-[rgb(var(--primary))]"
            >
              {FOOTER_LABELS.ICP_PREFIX}{FOOTER_CONFIG.ICP_NUMBER}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer