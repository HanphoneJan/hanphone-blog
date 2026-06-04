'use client'

import { useState, useCallback } from 'react'
import type { QueryInfo } from '../types'

export function useBlogFilters() {
  const [queryInfo, setQueryInfo] = useState<QueryInfo>({ title: '', typeId: null })
  const [pagenum, setPagenum] = useState(1)
  const [pagesize, setPagesize] = useState(8)
  const [selectedType, setSelectedType] = useState<string>('')

  const handleTypeSelect = useCallback((typeName: string, typeList: { id: number; name: string }[]) => {
    const type = typeList.find(t => t.name === typeName)
    setSelectedType(typeName)
    setQueryInfo(prev => ({ ...prev, typeId: type?.id || null }))
  }, [])

  const clearSearch = useCallback(() => {
    setQueryInfo({ title: '', typeId: null })
    setSelectedType('')
    setPagenum(1)
  }, [])

  const handleSearch = useCallback((title: string) => {
    setQueryInfo(prev => ({ ...prev, title }))
    setPagenum(1)
  }, [])

  // 生成分页页码（响应式优化）
  const generatePageNumbers = useCallback((totalcount: number, screenWidth: number) => {
    const totalPages = Math.ceil(totalcount / pagesize)
    const pages: (number | string)[] = []
    const maxVisible = screenWidth < 640 ? 3 : 5

    // 总是显示第一页
    if (pagenum > maxVisible) {
      pages.push(1)
      if (pagenum > maxVisible + 1) pages.push('...')
    }

    // 显示当前页附近的页码
    const startPage = Math.max(1, pagenum - Math.floor(maxVisible / 2))
    const endPage = Math.min(totalPages, startPage + maxVisible - 1)

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    // 总是显示最后一页
    if (pagenum < totalPages - maxVisible + 1) {
      if (pagenum < totalPages - maxVisible) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }, [pagenum, pagesize])

  return {
    queryInfo,
    pagenum,
    pagesize,
    selectedType,
    setPagenum,
    setPagesize,
    setSelectedType,
    handleTypeSelect,
    clearSearch,
    handleSearch,
    generatePageNumbers
  }
}
