'use client'

import { useState, useEffect, useMemo } from 'react'
import type { FriendLink, FilterState } from '../types'

export function useLinkFilters(friendLinkList: FriendLink[]) {
  const [filters, setFilters] = useState<FilterState>({
    type: '',
    searchQuery: ''
  })

  // 筛选逻辑
  const filteredList = useMemo(() => {
    let result = [...friendLinkList]

    // 按类型筛选
    if (filters.type) {
      result = result.filter(item => item.type === filters.type)
    }

    // 按名称搜索 - 不区分大小写
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(item => item.name.toLowerCase().includes(query))
    }

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
      searchQuery: ''
    })
  }

  return {
    filters,
    filteredList,
    handleFilterChange,
    resetFilters
  }
}
