'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import { useUser } from '@/contexts/UserContext'
import { useEssays, useInfiniteScroll, useEssayActions, useFileGallery } from './hooks'
import { EssayCard, EssaySkeleton, EssayEmpty, ImageZoomModal, LoadMore } from './components'
import type { Essay } from './types'
import { staggerContainerVariants, skeletonVariants, cardVariants } from '@/components/shared/PageTransition'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface EssayClientProps {
  initialEssays?: Essay[]
}

export default function EssayClient({ initialEssays }: EssayClientProps) {
  const { userInfo, administrator, onShowLogin } = useUser()
  const { state, dispatch, fetchData, formatEssays } = useEssays(userInfo, { initialEssays })
  const { hasMore, isLoadingMore, loadMoreRef, getEssayList } = useInfiniteScroll({
    userInfo,
    fetchData,
    formatEssays,
    dispatch
  })
  const { toggleLike, submitComment, submitReply, deleteComment, toggleReplyBox } = useEssayActions({
    userInfo,
    essays: state.essays,
    administrator,
    onShowLogin,
    dispatch,
    fetchData
  })
  const { zoomData, openFile, closeZoom } = useFileGallery()

  const [screenWidth, setScreenWidth] = useState(1200)
  const [visibleEssayId, setVisibleEssayId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; essayId: number; commentId: number | null }>({
    isOpen: false, essayId: 0, commentId: null
  })
  const visibleObserverRef = useRef<IntersectionObserver | null>(null)

  const isMobile = screenWidth < 768

  // 监听屏幕尺寸
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 初始化加载
  useEffect(() => {
    getEssayList()
  }, [getEssayList])

  // 处理评论输入变化
  const handleCommentChange = useCallback((essayId: number, value: string) => {
    dispatch({ type: 'SET_COMMENT_INPUT', payload: { essayId, value } })
  }, [dispatch])

  // 处理回复输入变化
  const handleReplyChange = useCallback((commentId: number, value: string) => {
    dispatch({ type: 'SET_REPLY_INPUT', payload: { commentId, value } })
  }, [dispatch])

  // 处理回复提交
  const handleSubmitReply = useCallback(
    (essayId: number, commentId: number) => {
      const content = state.replyInputs[commentId] || ''
      submitReply(essayId, commentId, content)
    },
    [submitReply, state.replyInputs]
  )

  // 打开删除评论弹窗
  const handleRequestDeleteComment = useCallback((essayId: number, commentId: number) => {
    setDeleteDialog({ isOpen: true, essayId, commentId })
  }, [])

  // 确认删除评论
  const handleConfirmDeleteComment = useCallback(() => {
    if (deleteDialog.commentId !== null) {
      deleteComment(deleteDialog.essayId, deleteDialog.commentId)
    }
    setDeleteDialog(prev => ({ ...prev, isOpen: false }))
  }, [deleteDialog.essayId, deleteDialog.commentId, deleteComment])

  // 取消删除评论
  const handleCancelDeleteComment = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  // 哈希跳转：/essays/#123 → 定位到对应随笔（扣掉固定 Header 高度）
  // 抽成函数，供首次数据到达、hashchange、同页深链三种场景复用
  const scrollToHash = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (typeof window === 'undefined') return false
      const hash = window.location.hash
      if (!hash) return false
      const essayId = parseInt(hash.slice(1), 10)
      if (isNaN(essayId)) return false
      const element = document.getElementById(essayId.toString())
      if (!element) return false
      const headerHeight = document.querySelector('.site-header')?.clientHeight || 56
      window.scrollTo({ top: element.offsetTop - headerHeight - 16, behavior })
      return true
    },
    []
  )

  // 首次数据到达后滚动一次；随笔没加载出来（如深链指向第 2 页）时不标记，后续数据到达会再试
  const hasScrolledToHash = useRef(false)
  useEffect(() => {
    if (state.essays.length === 0 || hasScrolledToHash.current) return
    const timer = window.setTimeout(() => {
      if (scrollToHash()) hasScrolledToHash.current = true
    }, 100)
    return () => window.clearTimeout(timer)
  }, [state.essays, scrollToHash])

  // 已在随笔页时再次点击通知/收藏里的 /essays/#id：只改 hash，不会重新挂载，靠这个监听定位
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleHashChange = () => {
      // 同步写 hash 时页面上可能还没有对应随笔，交给上面的数据到达副作用处理
      scrollToHash()
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [scrollToHash])

  // 可见性观察器
  useEffect(() => {
    if (visibleObserverRef.current) {
      visibleObserverRef.current.disconnect()
    }

    visibleObserverRef.current = new IntersectionObserver(
      entries => {
        let hasVisible = false
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            hasVisible = true
            const essayId = parseInt(entry.target.id)
            if (!isNaN(essayId)) {
              setVisibleEssayId(essayId)
            }
          }
        })
        // 如果没有任何随笔可见（用户滚动到列表顶部），设为第一篇随笔
        if (!hasVisible && state.essays.length > 0) {
          setVisibleEssayId(state.essays[0].id)
        }
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0.1 }
    )

    if (typeof window !== 'undefined') {
      state.essays.forEach(essay => {
        const element = document.getElementById(essay.id.toString())
        if (element) {
          visibleObserverRef.current?.observe(element)
        }
      })
    }

    return () => {
      if (visibleObserverRef.current) {
        visibleObserverRef.current.disconnect()
      }
    }
  }, [state.essays])

  // 更新URL哈希 - 如果没有检测到可见随笔，使用第一篇随笔的id作为默认哈希
  useEffect(() => {
    if (typeof window === 'undefined' || state.essays.length === 0) return
    // 已离开随笔页（如导航到其他页面的退场动画期间）时不再改写 URL，
    // 否则 replaceState 会把路由刚 push 的新页面历史条目改回 /essays#id，
    // 导致导航失败/URL 错乱
    if (!window.location.pathname.startsWith('/essays')) return
    // 观察器还没报告任何可见随笔时不要改写：深链 /essays/#123 刚进入时
    // visibleEssayId 仍是 null，此时写入第一篇会立刻覆盖掉目标 hash
    if (visibleEssayId === null) return
    window.history.replaceState({}, '', `#${visibleEssayId}`)
  }, [visibleEssayId, state.essays])

  return (
    <div className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] overflow-hidden">
      <BgOverlay />

      <ImageZoomModal visible={zoomData.visible} url={zoomData.url} type={zoomData.type} onClose={closeZoom} />

      {administrator && (
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          title="删除评论"
          message="确定要删除这条评论吗？此操作不可恢复。"
          confirmText="删除"
          cancelText="取消"
          variant="danger"
          onConfirm={handleConfirmDeleteComment}
          onCancel={handleCancelDeleteComment}
        />
      )}

      <main className="flex-1 w-full mx-auto lg:py-0 relative z-10 px-0 md:px-6 lg:px-8 page-transition">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-0">
            <AnimatePresence mode='wait'>
              {state.loading ? (
                <motion.div
                  key='skeleton'
                  variants={skeletonVariants}
                  initial='initial'
                  exit='exit'
                >
                  <div className="space-y-0">
                    {[1, 2, 3].map(item => (
                      <EssaySkeleton key={item} isMobile={isMobile} />
                    ))}
                  </div>
                </motion.div>
              ) : state.essays.length > 0 ? (
                <motion.div
                  key='content'
                  variants={staggerContainerVariants}
                  initial='initial'
                  animate='animate'
                >
                  {state.essays.map((essay) => (
                    <motion.div key={essay.id} id={essay.id.toString()} variants={cardVariants} className='essay-card scroll-mt-14'>
                      <EssayCard
                        essay={essay}
                        isMobile={isMobile}
                        userInfo={userInfo}
                        administrator={administrator}
                        commentInput={state.commentInputs[essay.id] || ''}
                        replyInputs={state.replyInputs}
                        showReplyBox={state.showReplyBox}
                        onToggleLike={toggleLike}
                        onSubmitComment={submitComment}
                        onSubmitReply={handleSubmitReply}
                        onDeleteComment={handleRequestDeleteComment}
                        onCommentChange={handleCommentChange}
                        onReplyChange={handleReplyChange}
                        onToggleReplyBox={toggleReplyBox}
                        openFile={openFile}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key='empty' variants={cardVariants} initial='initial' animate='animate'>
                  <EssayEmpty isMobile={isMobile} />
                </motion.div>
              )}
            </AnimatePresence>

            <LoadMore ref={loadMoreRef} hasMore={hasMore} isLoading={isLoadingMore} />
          </div>
        </div>
      </main>
    </div>
  )
}
