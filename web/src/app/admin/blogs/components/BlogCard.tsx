'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Edit, Delete, Image as ImageIcon, Loader2, Star, StarOff, Eye, EyeOff } from 'lucide-react'
import { TagManager } from './TagManager'
import { formatDate } from '../utils/blogHelpers'
import type { Blog } from '../types'

interface BlogCardProps {
  blog: Blog
  updateRecommendLoading: number | null
  updatePublishedLoading: number | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onOpenEditDialog: (blog: Blog) => void
  onOpenPicDialog: (blog: Blog) => void
  onRemoveBlog: (id: number) => void
  onOpenTypeDialog: (blog: Blog) => void
  onOpenFlagDialog: (blog: Blog) => void
  onToggleRecommend: (blog: Blog) => void
  onTogglePublish: (blog: Blog) => void
  onShowInput: (blog: Blog) => void
  onInputConfirm: (blog: Blog) => void
  onTagClose: (index: number, blog: Blog) => void
  onEnterKeyPress: (e: React.KeyboardEvent, blog: Blog) => void
  onInputChange: (blogId: number, value: string) => void
}

export function BlogCard({
  blog,
  updateRecommendLoading,
  updatePublishedLoading,
  inputRef,
  onOpenEditDialog,
  onOpenPicDialog,
  onRemoveBlog,
  onOpenTypeDialog,
  onOpenFlagDialog,
  onToggleRecommend,
  onTogglePublish,
  onShowInput,
  onInputConfirm,
  onTagClose,
  onEnterKeyPress,
  onInputChange
}: BlogCardProps) {
  return (
    <div className="lg:hidden p-4 border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--muted)/0.6)] dark:border-[rgb(var(--border))] dark:hover:bg-[rgb(var(--bg)/0.6)]">
      {/* 首行：标题和操作按钮 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/blogInfo?id=${blog.id}`}
            className="transition-colors font-medium text-base block truncate text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] dark:text-[rgb(var(--primary))] dark:hover:text-[rgb(var(--primary-hover))]"
          >
            {blog.title}
          </Link>
          <p className="text-sm mt-1 line-clamp-2 text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]">
            {blog.description || '暂无描述'}
          </p>
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <button
            onClick={() => onOpenEditDialog(blog)}
            className="p-1.5 rounded-lg transition-colors bg-blue-100/40 hover:bg-blue-100/60 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/40 dark:text-blue-400"
            title="编辑"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onOpenPicDialog(blog)}
            className="p-1.5 rounded-lg transition-colors bg-green-100/40 hover:bg-green-100/60 text-green-600 dark:bg-green-600/20 dark:hover:bg-green-600/40 dark:text-green-400"
            title="修改首图"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemoveBlog(blog.id)}
            className="p-1.5 rounded-lg transition-colors bg-red-100/40 hover:bg-red-100/60 text-red-600 dark:bg-red-600/20 dark:hover:bg-red-600/40 dark:text-red-400"
            title="删除"
          >
            <Delete className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 第二行：首图、分类、推荐状态 */}
      <div className="flex items-center gap-3 mb-3">
        {/* 首图 */}
        <div className="relative w-16 h-12 rounded-md overflow-hidden border shrink-0 border-[rgb(var(--border))]">
          {blog.firstPicture ? (
            <Image
              src={blog.firstPicture}
              alt={blog.title}
              width={64}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[rgb(var(--muted))/0.6] flex items-center justify-center dark:bg-[rgb(var(--bg))/0.6]">
              <ImageIcon className="h-4 w-4 text-[rgb(var(--text-muted))]" />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-wrap gap-2 items-center">
          {/* 分类 */}
          <span
            className="transition-colors flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap cursor-pointer hover:text-[rgb(var(--primary))] bg-[rgb(var(--muted))/0.4] dark:hover:text-[rgb(var(--primary))] dark:bg-[rgb(var(--muted))/0.4]"
            onClick={() => onOpenTypeDialog(blog)}
          >
            {blog.type.name}
            <Edit className="h-3 w-3" />
          </span>

          {/* 文章类型flag */}
          <span
            className="transition-colors flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap cursor-pointer hover:text-[rgb(var(--primary))] bg-amber-100/40 dark:hover:text-[rgb(var(--primary))] dark:bg-amber-900/40 dark:text-amber-300"
            onClick={() => onOpenFlagDialog(blog)}
          >
            {blog.flag || '原创'}
          </span>

          {/* 推荐状态 */}
          <button
            onClick={() => onToggleRecommend(blog)}
            disabled={updateRecommendLoading === blog.id}
            className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 text-xs ${
              blog.recommend
                ? 'bg-yellow-500/30 text-yellow-600 hover:bg-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-400 dark:hover:bg-yellow-500/30'
                : 'bg-[rgb(var(--muted))/0.4] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--muted))/0.6] dark:bg-[rgb(var(--muted))/0.4] dark:text-[rgb(var(--text-muted))] dark:hover:bg-[rgb(var(--muted))/0.6]'
            } ${updateRecommendLoading === blog.id ? 'opacity-70' : ''}`}
          >
            {updateRecommendLoading === blog.id ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : blog.recommend ? (
              <>
                <Star className="h-3 w-3 fill-yellow-400 mr-1" />
                已推荐
              </>
            ) : (
              <>
                <StarOff className="h-3 w-3 mr-1" />
                未推荐
              </>
            )}
          </button>

          {/* 发布状态 */}
          <button
            onClick={() => onTogglePublish(blog)}
            disabled={updatePublishedLoading === blog.id}
            className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 text-xs ${
              blog.published
                ? 'bg-green-500/30 text-green-600 hover:bg-green-500/40 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30'
                : 'bg-[rgb(var(--muted))/0.4] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--muted))/0.6] dark:bg-[rgb(var(--muted))/0.4] dark:text-[rgb(var(--text-muted))] dark:hover:bg-[rgb(var(--muted))/0.6]'
            } ${updatePublishedLoading === blog.id ? 'opacity-70' : ''}`}
          >
            {updatePublishedLoading === blog.id ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : blog.published ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                已发布
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                未发布
              </>
            )}
          </button>

          {/* 阅读量 */}
          <span className="text-xs px-2 py-1 rounded-md text-[rgb(var(--text))] bg-[rgb(var(--muted))/0.4] dark:text-[rgb(var(--text))] dark:bg-[rgb(var(--muted))/0.4]">
            阅读: {blog.views}
          </span>
        </div>
      </div>

      {/* 第三行：标签 */}
      <div className="mb-3">
        <TagManager
          blog={blog}
          inputRef={inputRef}
          onShowInput={onShowInput}
          onInputConfirm={onInputConfirm}
          onTagClose={onTagClose}
          onEnterKeyPress={onEnterKeyPress}
          onInputChange={onInputChange}
        />
      </div>

      {/* 第四行：更新时间 */}
      <div className="text-xs pt-2 border-t text-[rgb(var(--text-muted))] border-[rgb(var(--border))]">
        更新: {formatDate(blog.updateTime)}
      </div>
    </div>
  )
}
