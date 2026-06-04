'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Edit, Delete, Image as ImageIcon, Loader2, Star, StarOff, Eye, EyeOff } from 'lucide-react'
import { TagManager } from './TagManager'
import { formatDate, formatDateOnly } from '../utils/blogHelpers'
import type { Blog, Type } from '../types'

interface BlogTableProps {
  blogList: Blog[]
  typeList: Type[]
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

export function BlogTable({
  blogList,
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
}: BlogTableProps) {
  return (
    <div className="bg-[rgb(var(--card)/0.8)] backdrop-blur-sm border-[rgb(var(--border))] rounded-b-xl overflow-hidden shadow-sm dark:bg-[rgb(var(--card)/0.6)] dark:border-[rgb(var(--border))]">
      {/* 表格头部 */}
      <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 sm:px-6 sm:py-4 bg-[rgb(var(--muted)/0.4)] border-[rgb(var(--border))] border-b text-xs sm:text-sm font-medium dark:bg-[rgb(var(--bg)/0.4)] dark:border-[rgb(var(--border))]">
        <div className="col-span-1">首图</div>
        <div className="col-span-3">标题</div>
        <div className="col-span-1 text-center">推荐/发布</div>
        <div className="col-span-1">分类</div>
        <div className="col-span-1">类型</div>
        <div className="col-span-1">标签</div>
        <div className="col-span-1 text-center">阅读量</div>
        <div className="col-span-1">更新时间</div>
        <div className="col-span-2 text-center">操作</div>
      </div>

      {/* 表格内容 */}
      {blogList.length > 0 ? (
        blogList.map(blog => (
          <div
            key={blog.id}
            className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--muted)/0.6)] last:border-0 transition-all duration-300 dark:border-[rgb(var(--border))] dark:hover:bg-[rgb(var(--bg)/0.6)]"
          >
            {/* 桌面端主行 */}
            <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 sm:px-6 sm:py-4 items-center">
              {/* 首图 */}
              <div className="col-span-1">
                <div className="relative w-14 h-9 sm:w-16 sm:h-10 rounded-md overflow-hidden border border-[rgb(var(--border))]">
                  {blog.firstPicture ? (
                    <Image
                      src={blog.firstPicture}
                      alt={blog.title}
                      width={192}
                      height={144}
                      className="object-cover transition-transform hover:scale-110 duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[rgb(var(--muted)/0.6)] flex items-center justify-center dark:bg-[rgb(var(--bg)/0.6)]">
                      <ImageIcon className="h-5 w-5 text-[rgb(var(--text-muted))]" />
                    </div>
                  )}
                </div>
              </div>

              {/* 标题 */}
              <div className="col-span-3 truncate">
                <Link
                  href={`/blogInfo?id=${blog.id}`}
                  className="transition-colors font-medium text-sm text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] dark:text-[rgb(var(--primary))] dark:hover:text-[rgb(var(--primary-hover))]"
                >
                  {blog.title}
                </Link>
                <p className="text-xs mt-1 line-clamp-1 text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]">
                  {blog.description || '暂无描述'}
                </p>
              </div>

              {/* 推荐/发布状态 */}
              <div className="col-span-1 flex items-center justify-center gap-1">
                <button
                  onClick={() => onToggleRecommend(blog)}
                  disabled={updateRecommendLoading === blog.id}
                  className={`p-1.5 rounded-full transition-all ${
                    blog.recommend
                      ? 'bg-yellow-500/30 text-yellow-600 hover:bg-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-400 dark:hover:bg-yellow-500/30'
                      : 'bg-[rgb(var(--muted))/0.4] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--muted))/0.6] dark:bg-[rgb(var(--muted))/0.4] dark:text-[rgb(var(--text-muted))] dark:hover:bg-[rgb(var(--muted))/0.6]'
                  } ${updateRecommendLoading === blog.id ? 'opacity-70' : ''}`}
                  title={blog.recommend ? '取消推荐' : '推荐'}
                  aria-label={blog.recommend ? '取消推荐' : '推荐'}
                >
                  {updateRecommendLoading === blog.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : blog.recommend ? (
                    <Star className="h-4 w-4 fill-yellow-400" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => onTogglePublish(blog)}
                  disabled={updatePublishedLoading === blog.id}
                  className={`p-1.5 rounded-full transition-all ${
                    blog.published
                      ? 'bg-green-500/30 text-green-600 hover:bg-green-500/40 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30'
                      : 'bg-[rgb(var(--muted))/0.4] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--muted))/0.6] dark:bg-[rgb(var(--muted))/0.4] dark:text-[rgb(var(--text-muted))] dark:hover:bg-[rgb(var(--muted))/0.6]'
                  } ${updatePublishedLoading === blog.id ? 'opacity-70' : ''}`}
                  title={blog.published ? '取消发布' : '发布'}
                  aria-label={blog.published ? '取消发布' : '发布'}
                >
                  {updatePublishedLoading === blog.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : blog.published ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* 分类 */}
              <div className="col-span-1 flex items-center">
                <span
                  className="transition-colors flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap cursor-pointer hover:text-[rgb(var(--primary))] bg-[rgb(var(--muted))/0.4] dark:hover:text-[rgb(var(--primary))] dark:bg-[rgb(var(--muted))/0.4]"
                  onClick={() => onOpenTypeDialog(blog)}
                >
                  {blog.type.name}
                  <Edit className="h-3 w-3" />
                </span>
              </div>

              {/* 文章类型flag */}
              <div className="col-span-1 flex items-center">
                <span
                  className="transition-colors flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap cursor-pointer hover:text-[rgb(var(--primary))] bg-amber-100/40 dark:hover:text-[rgb(var(--primary))] dark:bg-amber-900/40 dark:text-amber-300"
                  onClick={() => onOpenFlagDialog(blog)}
                >
                  {blog.flag || '原创'}
                </span>
              </div>

              {/* 标签 */}
              <div className="col-span-1 flex flex-wrap gap-1 max-h-10 overflow-hidden">
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

              {/* 阅读量 */}
              <div className="col-span-1 text-center text-sm text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">{blog.views}</div>

              {/* 更新时间 */}
              <div className="col-span-1 text-xs sm:text-sm text-[rgb(var(--text-muted))] dark:text-[rgb(var(--text-muted))]">
                {formatDateOnly(blog.updateTime)}
              </div>

              {/* 操作 */}
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => onOpenEditDialog(blog)}
                  className="p-2 rounded-lg transition-colors flex items-center justify-center bg-blue-100/40 hover:bg-blue-100/60 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/40 dark:text-blue-400"
                  title="编辑"
                  aria-label="编辑"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onOpenPicDialog(blog)}
                  className="p-2 rounded-lg transition-colors flex items-center justify-center bg-green-100/40 hover:bg-green-100/60 text-green-600 dark:bg-green-600/20 dark:hover:bg-green-600/40 dark:text-green-400"
                  title="修改首图"
                  aria-label="修改首图"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onRemoveBlog(blog.id)}
                  className="p-2 rounded-lg transition-colors flex items-center justify-center bg-red-100/40 hover:bg-red-100/60 text-red-600 dark:bg-red-600/20 dark:hover:bg-red-600/40 dark:text-red-400"
                  title="删除"
                  aria-label="删除"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      ) : null}
    </div>
  )
}
