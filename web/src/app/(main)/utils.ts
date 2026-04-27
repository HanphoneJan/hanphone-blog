/**
 * 首页工具函数
 */

import { HOME_CONFIG, PAGINATION } from '@/lib/constants'
import type { HomeQueryInfo } from './types'

/**
 * 格式化日期
 * @param dateString ISO格式日期字符串
 * @returns 格式化后的中文日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

/**
 * 生成分页页码数组
 * @param totalcount 总记录数
 * @param queryInfo 查询参数
 * @returns 页码数组（包含省略号）
 */
export function generatePageNumbers(
  totalcount: number,
  queryInfo: HomeQueryInfo
): (number | string)[] {
  const totalPages = Math.ceil(totalcount / queryInfo.pagesize)
  const pages: (number | string)[] = []
  const current = queryInfo.pagenum

  // 始终显示第一页
  pages.push(1)

  // 显示当前页附近的页码
  if (current > 3) pages.push('...')
  if (current > 2) pages.push(current - 1)
  if (current !== 1 && current !== totalPages) pages.push(current)
  if (current < totalPages - 1) pages.push(current + 1)
  if (current < totalPages - 2) pages.push('...')

  // 始终显示最后一页
  if (totalPages > 1) pages.push(totalPages)

  return pages
}

/**
 * 比较函数（用于排序）
 * 按blogs数组长度降序排序
 * @param property 要比较的属性名
 * @returns 比较函数
 */
export function compare<T extends { blogs?: unknown[] }>(property: keyof T) {
  return (a: T, b: T): number => {
    const value1 = Array.isArray(a[property]) ? (a[property] as unknown[]).length : 0
    const value2 = Array.isArray(b[property]) ? (b[property] as unknown[]).length : 0
    return value2 - value1
  }
}

/**
 * 判断是否需要使用紧凑分页布局
 * @param screenWidth 屏幕宽度
 * @returns 是否为紧凑布局
 */
export function isCompactLayout(screenWidth: number): boolean {
  return screenWidth < HOME_CONFIG.PAG_COMPACT_BREAKPOINT
}

/**
 * 创建缓存键
 * @param typeId 分类ID
 * @param tagIds 标签ID数组
 * @returns 缓存键字符串
 */
export function createCacheKey(typeId: number | null, tagIds: number[]): string {
  return `type_${typeId ?? 'null'}_tags_${tagIds.join(',')}`
}
