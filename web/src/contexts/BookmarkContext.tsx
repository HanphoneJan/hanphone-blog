'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { API_CODE } from '@/lib/constants'
import {
  ENDPOINTS,
  type ApiResult,
  type BookmarkItem,
  type BookmarkType
} from '@/lib/api'
import apiClient, { isUnauthorizedError } from '@/lib/utils'
import { useUser } from './UserContext'

/**
 * 收藏状态（仅「是否已收藏」）。
 *
 * - 只保存 `Set<"BLOG:12">`，不保存标题/封面等元数据；列表页自己拉 `/bookmarks`。
 * - 登录后只拉一次 `/bookmarks`；退出登录清空；遇到 401 直接停摆，避免刷新循环。
 * - add / remove / toggle 先乐观更新，请求失败回滚并返回 null。
 */

/** 组合 key：`TYPE:key`，与 Set 内保存形式一致 */
export function bookmarkKey(type: BookmarkType, key: string | number): string {
  return `${type}:${String(key).trim()}`
}

interface BookmarkContextType {
  /** 是否已收藏 */
  isBookmarked: (type: BookmarkType, key: string | number) => boolean
  /** 该条目是否有请求在途（按钮禁用用） */
  isPending: (type: BookmarkType, key: string | number) => boolean
  /** 收藏；返回更新后的状态，失败（含 401）返回 null */
  add: (type: BookmarkType, key: string | number) => Promise<boolean | null>
  /** 取消收藏；返回更新后的状态，失败（含 401）返回 null */
  remove: (type: BookmarkType, key: string | number) => Promise<boolean | null>
  /** 切换收藏 */
  toggle: (type: BookmarkType, key: string | number) => Promise<boolean | null>
  /** 重新拉取整份收藏列表（登录后自动调用一次） */
  refresh: () => Promise<void>
}

const BookmarkContext = createContext<BookmarkContextType>({
  isBookmarked: () => false,
  isPending: () => false,
  add: async () => null,
  remove: async () => null,
  toggle: async () => null,
  refresh: async () => {}
})

export const useBookmarks = () => useContext(BookmarkContext)

export const BookmarkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, userInfo } = useUser()

  const [keys, setKeys] = useState<Set<string>>(() => new Set())
  const [pending, setPending] = useState<Set<string>>(() => new Set())
  // 同步镜像：toggle 里要立刻读到当前值，不能依赖 state 更新时序
  const keysRef = useRef<Set<string>>(new Set())
  const pendingRef = useRef<Set<string>>(new Set())
  // 已经为哪个登录身份拉过列表（token 刷新但用户不变时不重复拉）
  const loadedForRef = useRef<string | null>(null)
  // 401 之后停止一切请求，直到退出/重新登录
  const blockedRef = useRef(false)

  const identity = userInfo?.id != null ? `u:${userInfo.id}` : null

  const commitKeys = useCallback((next: Set<string>) => {
    keysRef.current = next
    setKeys(next)
  }, [])

  const commitPending = useCallback((composite: string, on: boolean) => {
    const next = new Set(pendingRef.current)
    if (on) next.add(composite)
    else next.delete(composite)
    pendingRef.current = next
    setPending(next)
  }, [])

  const fetchAll = useCallback(async () => {
    const response = await apiClient.get<ApiResult<BookmarkItem[] | null>>(ENDPOINTS.BOOKMARKS.LIST())
    const body = response.data
    if (!body.flag || body.code !== API_CODE.SUCCESS) {
      throw new Error(body.message || '获取收藏失败')
    }
    const list = Array.isArray(body.data) ? body.data : []
    commitKeys(new Set(list.map(item => bookmarkKey(item.type, item.key))))
  }, [commitKeys])

  const refresh = useCallback(async () => {
    if (!token || !identity || blockedRef.current) return
    try {
      await fetchAll()
    } catch (error) {
      // 401：apiClient 已经尝试过 refresh，这里不再重试
      if (isUnauthorizedError(error)) blockedRef.current = true
    }
  }, [token, identity, fetchAll])

  // 登录后只拉一次；退出登录清空
  useEffect(() => {
    if (!token || !identity) {
      loadedForRef.current = null
      blockedRef.current = false
      if (keysRef.current.size > 0) commitKeys(new Set())
      if (pendingRef.current.size > 0) {
        pendingRef.current = new Set()
        setPending(pendingRef.current)
      }
      return
    }

    // 401 停摆后同一账号重新登录（token 变化、identity 不变）：先复位，
    // 并让 loadedForRef 失效以便重新拉一次收藏，否则后续操作会一直 no-op
    if (blockedRef.current) {
      blockedRef.current = false
      loadedForRef.current = null
    }

    if (loadedForRef.current === identity) return
    loadedForRef.current = identity
    void refresh()
  }, [token, identity, refresh, commitKeys])

  const applyChange = useCallback(
    async (
      type: BookmarkType,
      key: string | number,
      nextValue: boolean
    ): Promise<boolean | null> => {
      const rawKey = String(key).trim()
      if (!rawKey || blockedRef.current) return null

      const composite = bookmarkKey(type, rawKey)
      if (pendingRef.current.has(composite)) return null

      const previous = keysRef.current.has(composite)
      if (previous === nextValue) return previous

      // 乐观更新
      const optimistic = new Set(keysRef.current)
      if (nextValue) optimistic.add(composite)
      else optimistic.delete(composite)
      commitKeys(optimistic)
      commitPending(composite, true)

      try {
        const response = nextValue
          ? await apiClient.post<ApiResult<{ bookmarked: boolean }>>(ENDPOINTS.BOOKMARKS.ADD, {
              type,
              key: rawKey
            })
          : await apiClient.delete<ApiResult<{ bookmarked: boolean }>>(
              ENDPOINTS.BOOKMARKS.REMOVE(type, rawKey)
            )

        const body = response.data
        if (!body.flag || body.code !== API_CODE.SUCCESS) {
          throw new Error(body.message || (nextValue ? '收藏失败' : '取消收藏失败'))
        }
        return nextValue
      } catch (error) {
        // 回滚（只回滚当前条目，避免覆盖其它并发操作）
        const rollback = new Set(keysRef.current)
        if (previous) rollback.add(composite)
        else rollback.delete(composite)
        commitKeys(rollback)
        if (isUnauthorizedError(error)) blockedRef.current = true
        return null
      } finally {
        commitPending(composite, false)
      }
    },
    [commitKeys, commitPending]
  )

  const add = useCallback(
    (type: BookmarkType, key: string | number) => applyChange(type, key, true),
    [applyChange]
  )

  const remove = useCallback(
    (type: BookmarkType, key: string | number) => applyChange(type, key, false),
    [applyChange]
  )

  const toggle = useCallback(
    (type: BookmarkType, key: string | number) =>
      applyChange(type, key, !keysRef.current.has(bookmarkKey(type, key))),
    [applyChange]
  )

  const isBookmarked = useCallback(
    (type: BookmarkType, key: string | number) => keys.has(bookmarkKey(type, key)),
    [keys]
  )

  const isPending = useCallback(
    (type: BookmarkType, key: string | number) => pending.has(bookmarkKey(type, key)),
    [pending]
  )

  const value = useMemo<BookmarkContextType>(
    () => ({ isBookmarked, isPending, add, remove, toggle, refresh }),
    [isBookmarked, isPending, add, remove, toggle, refresh]
  )

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>
}

export default BookmarkProvider
