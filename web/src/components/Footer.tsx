'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBilibili } from '@fortawesome/free-brands-svg-icons'
import { Mail, Eye, TrendingUp, Rss } from 'lucide-react'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeProvider'
import {  FOOTER_CONFIG, ROUTES , API_CODE } from '@/lib/constants'
import { FOOTER_LABELS } from '@/lib/labels'

// 定义接口返回数据类型
interface VisitCountResponse {
  flag: boolean
  code: number
  message: string
  data: number
}

const Footer: React.FC = () => {
  const { theme } = useTheme()
  const [totalVisitCount, setTotalVisitCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchVisitCount = async (retryCount = 0): Promise<void> => {
      try {
        setLoading(true)
        const response = await apiClient.get<VisitCountResponse>(ENDPOINTS.GET_VISIT_COUNT, {
          timeout: 30000, // 增加超时到30秒
        })

        if (response.data.flag && response.data.code === API_CODE.SUCCESS) {
          setTotalVisitCount(response.data.data)
          setError(false)
        } else {
          console.error('获取访问量失败:', response.data.message)
          setError(true)
        }
      } catch (err) {
        // 网络错误或超时，最多重试2次
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

  return (
    <footer className="z-5 relative py-8 mt-3 lg:mt-6 bg-[rgb(var(--bg))] border-t border-[rgb(var(--border))]"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 主要内容区域 - 采用响应式网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mb-8">
          {/* 二维码区域 - 在小屏幕占满宽度，大屏幕占2列 */}
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

          {/* 联系我区域 - 小屏幕占满，大屏幕占3列 */}
          <div className="md:col-span-3 flex flex-col">
            <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-[rgb(var(--border))] relative after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-12 after:bg-[rgb(var(--primary))] text-[rgb(var(--primary))]">
              {FOOTER_LABELS.CONTACT_ME}
            </h4>
            <div className="flex flex-col h-full justify-between">
              <p className="flex items-center text-sm sm:text-base transition-colors duration-300 mb-4 text-[rgb(var(--text))] hover:text-[rgb(var(--primary))]">
                <Mail className="mr-2 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" />
                <span className="truncate whitespace-nowrap">{FOOTER_CONFIG.EMAIL}</span>
              </p>

              <div className="flex space-x-3">
                <a
                  href={FOOTER_CONFIG.GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))]"
                  aria-label="GitHub"
                >
                  <FontAwesomeIcon
                    icon={faGithub}
                    className="h-4 w-4 text-[rgb(var(--text))]"
                  />
                </a>
                <a
                  href={FOOTER_CONFIG.BILIBILI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))]"
                  aria-label="Bilibili"
                >
                  <FontAwesomeIcon
                    icon={faBilibili}
                    className="h-4 w-4 text-pink-400"
                  />
                </a>
                <Link
                  href="/rss"
                  className="p-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-md flex items-center justify-center bg-[rgb(var(--card))] hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  aria-label="RSS订阅"
                  title="RSS订阅"
                >
                  <Rss className="h-4 w-4 text-orange-500" />
                </Link>
              </div>
            </div>
          </div>

          {/* 博客简介 - 小屏幕占满，大屏幕占4列 */}
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

          {/* 访问统计区域 - 小屏幕占满，大屏幕占3列 */}
          <div className="md:col-span-3">
            <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-[rgb(var(--border))] relative after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-12 after:bg-[rgb(var(--primary))] text-[rgb(var(--primary))]">
              {FOOTER_LABELS.SITE_STATS}
            </h4>
            <div className="h-full flex flex-col justify-start">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[rgb(var(--border))] shadow-sm hover:shadow-md transition-all duration-300 group bg-[rgb(var(--card))]">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[rgb(var(--primary))]/80 to-[rgb(var(--primary-hover))]/80">
                  <Eye className="h-5 w-5 text-white" />
                </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[rgb(var(--text-muted))]">
                        {FOOTER_LABELS.TOTAL_VISITS}
                      </span>
                      <TrendingUp className="h-3 w-3 text-[rgb(var(--success))]" />
                    </div>

                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-24 bg-gradient-to-r from-[rgb(var(--card))] to-[rgb(var(--hover))] rounded-md animate-pulse"></div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[rgb(var(--text-muted))]">
                          {FOOTER_LABELS.DATA_LOAD_FAIL}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))]">
                          {totalVisitCount?.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-[rgb(var(--text-muted))]">
                          {FOOTER_LABELS.VISITS_COUNT}
                        </span>
                      </div>
                    )}
                  </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-2 h-2 rounded-full animate-ping bg-[rgb(var(--primary))]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="my-6 opacity-60 border-t border-[rgb(var(--border))]"></div>

        {/* 底部信息区域 - 优化响应式布局 */}
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
