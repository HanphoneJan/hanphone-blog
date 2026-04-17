/**
 * 桌面端侧边栏组件
 */

import { motion, AnimatePresence } from 'framer-motion'
import { RecommendBlogCard } from './RecommendBlogCard'
import { RecommendSkeletonList } from './RecommendSkeleton'
import { TypeFilter } from './TypeFilter'
import { TagFilter } from './TagFilter'
import { staggerContainerVariants, skeletonVariants } from '@/components/shared/PageTransition'
import type { Blog, Type, Tag } from '../types'

interface SidebarProps {
  // Recommend blog props
  recommendList: Blog[]
  recommendLoading: boolean
  recommendVisible: boolean

  // Type filter props
  types: Type[]
  selectedTypeId: number | null
  typeLoading: boolean
  typeVisible: boolean
  showTypes: boolean
  moreType: boolean
  onToggleShowTypes: () => void
  onSelectType: (id: number) => void
  onToggleMoreType: () => void

  // Tag filter props
  tags: Tag[]
  selectedTagIds: number[]
  tagLoading: boolean
  tagVisible: boolean
  showTags: boolean
  moreTag: boolean
  onToggleShowTags: () => void
  onSelectTag: (id: number) => void
  onToggleMoreTag: () => void
}

export function Sidebar({
  recommendList,
  recommendLoading,
  recommendVisible,
  types,
  selectedTypeId,
  typeLoading,
  typeVisible,
  showTypes,
  moreType,
  onToggleShowTypes,
  onSelectType,
  onToggleMoreType,
  tags,
  selectedTagIds,
  tagLoading,
  tagVisible,
  showTags,
  moreTag,
  onToggleShowTags,
  onSelectTag,
  onToggleMoreTag
}: SidebarProps) {
  return (
    <div className="hidden lg:block space-y-6">
      {/* 推荐博客 */}
      <div className="bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm mb-2 rounded-xl shadow-sm p-4 border border-[rgb(var(--border))]">
        <div className="font-bold mb-1 border-b border-[rgb(var(--border))] pb-2 text-[rgb(var(--rose))] px-1 text-center">
          推荐博客
        </div>
        <div className="space-y-2">
          <AnimatePresence mode='wait'>
            {recommendLoading ? (
              <motion.div
                key='skeleton'
                variants={skeletonVariants}
                initial='initial'
                exit='exit'
              >
                <RecommendSkeletonList count={5} />
              </motion.div>
            ) : (
              <motion.div
                key='content'
                className={`transition-all duration-500 space-y-2 ${
                  recommendVisible ? 'opacity-100' : 'opacity-0'
                }`}
                variants={staggerContainerVariants}
                initial='initial'
                animate='animate'
              >
                {recommendList.map((blog, index) => (
                  <RecommendBlogCard key={blog.id} blog={blog} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 分类与标签筛选面板 */}
      <div className="bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm rounded-xl shadow-sm p-4 border border-[rgb(var(--border))]">
        <div
          className="font-bold mb-4 border-b border-[rgb(var(--orange)/0.3)] pb-2 text-[rgb(var(--orange))] px-1 text-center"
          style={{
            textShadow: '0 1px 2px rgba(251, 146, 60, 0.2)'
          }}
        >
          筛选
        </div>

        {/* 分类筛选 */}
        <TypeFilter
          types={types}
          selectedTypeId={selectedTypeId}
          loading={typeLoading}
          visible={typeVisible}
          showTypes={showTypes}
          moreType={moreType}
          onToggleShow={onToggleShowTypes}
          onSelectType={onSelectType}
          onToggleMore={onToggleMoreType}
          isMobile={false}
        />

        {/* 标签筛选 */}
        <TagFilter
          tags={tags}
          selectedTagIds={selectedTagIds}
          loading={tagLoading}
          visible={tagVisible}
          showTags={showTags}
          moreTag={moreTag}
          onToggleShow={onToggleShowTags}
          onSelectTag={onSelectTag}
          onToggleMore={onToggleMoreTag}
          isMobile={false}
        />
      </div>
    </div>
  )
}
