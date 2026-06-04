'use client'

import { useState, useEffect, useMemo } from 'react'
import type { FriendLink, FilterState } from '../types'

export function useLinkFilters(friendLinkList: FriendLink[]) {
  const [filters, setFilters] = useState<FilterState>({
    type: '',
    searchQuery: '',
    published: '',
    sortOrder: 'newest'
  })

  // 筛选+排序逻辑
  const filteredList = useMemo(() => {
    let result = [...friendLinkList]

    // 按类型筛选
    if (filters.type) {
      result = result.filter(item => item.type === filters.type)
    }

    // 按发布状态筛选
    if (filters.published !== '') {
      const isPublished = filters.published === 'true'
      result = result.filter(item => item.published === isPublished)
    }

    // 按名称/描述/URL/昵称搜索 - 不区分大小写
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query) ||
        (item.nickname && item.nickname.toLowerCase().includes(query))
      )
    }

    // 按时间排序
    result.sort((a, b) => {
      const timeA = a.createTime ? new Date(a.createTime).getTime() : 0
      const timeB = b.createTime ? new Date(b.createTime).getTime() : 0
      return filters.sortOrder === 'newest' ? timeB - timeA : timeA - timeB
    })

    return result
  }, [friendLinkList, filters])

  // 筛选器变化处理
  const handleFilterChange = (name: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      type: '',
      searchQuery: '',
      published: '',
      sortOrder: 'newest'
    })
  }

  // 统计信息
  const stats = useMemo(() => {
    const total = friendLinkList.length
    const published = friendLinkList.filter(item => item.published).length
    const pending = total - published
    return { total, published, pending }
  }, [friendLinkList])

  return {
    filters,
    filteredList,
    stats,
    handleFilterChange,
    resetFilters
  }
}
