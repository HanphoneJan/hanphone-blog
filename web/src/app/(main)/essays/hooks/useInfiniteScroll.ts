'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Essay, UserInfo } from '../types'
import { showAlert } from '@/lib/Alert'
import { ESSAY_LABELS } from '@/lib/labels'
import { ENDPOINTS } from '@/lib/api'

interface UseInfiniteScrollOptions {
  userInfo: UserInfo | null
  fetchData: (url: string, method?: string, data?: unknown) => Promise<any>
  formatEssays: (data: any[]) => Essay[]
  dispatch: React.Dispatch<any>
}

export function useInfiniteScroll({
  userInfo,
  fetchData,
  formatEssays,
  dispatch
}: UseInfiniteScrollOptions) {
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(page)
  const userInfoRef = useRef(userInfo)
  const dispatchRef = useRef(dispatch)

  // 同步 ref 与 state/props
  useEffect(() => {
    pageRef.current = page
    userInfoRef.current = userInfo
    dispatchRef.current = dispatch
  }, [page, userInfo, dispatch])

  const getEssayList = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true)
    } else {
      dispatchRef.current({ type: 'SET_LOADING', payload: true })
    }

    const currentPage = isLoadMore ? pageRef.current + 1 : 1
    const queryParams = {
      ...(userInfoRef.current?.id && { userId: userInfoRef.current.id }),
      page: currentPage,
      pageSize: 10
    }

    const res = await fetchData(ENDPOINTS.ESSAYS, 'GET', queryParams)

    const essayList = res.data?.content || []
    const totalPages = res.data?.totalPages || 1

    if (res.code === 200 && essayList.length > 0) {
      const sortedList = formatEssays(essayList)

      if (isLoadMore) {
        dispatchRef.current({ type: 'ADD_ESSAYS', payload: sortedList })
        setPage(currentPage)
      } else {
        dispatchRef.current({ type: 'SET_ESSAYS', payload: sortedList })
        setPage(1)
      }

      setHasMore(currentPage < totalPages)
    } else {
      if (isLoadMore) {
        setHasMore(false)
      }
    }

    if (isLoadMore) {
      setIsLoadingMore(false)
    } else {
      dispatchRef.current({ type: 'SET_LOADING', payload: false })
    }
  }, [fetchData, formatEssays])

  // 无限滚动 - 初始化IntersectionObserver
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !isLoadingMore) {
          getEssayList(true)
        }
      },
      { rootMargin: '0px 0px 200px 0px', threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, getEssayList])

  return {
    page,
    hasMore,
    isLoadingMore,
    loadMoreRef,
    getEssayList
  }
}
