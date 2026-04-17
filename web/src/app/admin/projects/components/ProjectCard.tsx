'use client'

import { Edit2, Save, X, Upload as UploadIcon, Trash2, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Project } from '../types'
import { PROJECT_TYPES } from '../utils'
import LinkManager from './LinkManager'
import StatusBadge from './StatusBadge'

interface ProjectCardProps {
  project: Project
  localValues: {
    title?: string
    content?: string
    imageUrl?: string
    url?: string
    techInput?: string
  }
  updateRecommendLoading: boolean
  imageUploadRef: React.RefObject<HTMLInputElement | null>
  onEditTitle: (projectId: number | null) => void
  onSaveTitle: (projectId: number | null) => void
  onCancelEditTitle: (projectId: number | null) => void
  onEditContent: (projectId: number | null) => void
  onSaveContent: (projectId: number | null) => void
  onCancelEditContent: (projectId: number | null) => void
  onEditImage: (projectId: number | null) => void
  onSaveImage: (projectId: number | null) => void
  onCancelEditImage: (projectId: number | null) => void
  onEditUrl: (projectId: number | null) => void
  onSaveUrl: (projectId: number | null) => void
  onCancelEditUrl: (projectId: number | null) => void
  onLocalInputChange: (projectId: number, field: string, value: string) => void
  onTypeChange: (projectId: number | null, type: number) => void
  onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>, projectId: number | null) => void
  onShowTagInput: (projectId: number | null) => void
  onConfirmTagInput: (project: Project) => void
  onRemoveTag: (index: number, project: Project) => void
  onToggleRecommend: (project: Project) => void
  onDelete: (projectId: number | null) => void
}

export const ProjectCard = ({
  project,
  localValues,
  updateRecommendLoading,
  imageUploadRef,
  onEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onEditContent,
  onSaveContent,
  onCancelEditContent,
  onEditImage,
  onSaveImage,
  onCancelEditImage,
  onEditUrl,
  onSaveUrl,
  onCancelEditUrl,
  onLocalInputChange,
  onTypeChange,
  onImageFileChange,
  onShowTagInput,
  onConfirmTagInput,
  onRemoveTag,
  onToggleRecommend,
  onDelete
}: ProjectCardProps) => {
  const projectId = project.id
  if (!projectId) return null

  return (
    <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] lg:rounded-lg p-4 hover:bg-[rgb(var(--hover))] transition-all duration-300">
      <div className="grid grid-cols-12 gap-4">
        {/* 图片区域 */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))] mb-2 self-start">
              项目图片
            </p>
            {project.editingImage ? (
              <div className="w-full space-y-3">
                <div className="relative w-full h-32 md:h-36 rounded-lg overflow-hidden">
                  <Image
                    src={localValues.imageUrl || project.pic_url}
                    alt={project.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    value={localValues.imageUrl || ''}
                    onChange={e => onLocalInputChange(projectId, 'imageUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    placeholder="图片URL"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => imageUploadRef.current?.click()}
                      className="flex-1 px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <UploadIcon className="h-4 w-4" />
                      上传
                    </button>
                    <button
                      onClick={() => onSaveImage(project.id)}
                      className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => onCancelEditImage(project.id)}
                      className="px-3 py-2 rounded bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
                <input
                  ref={imageUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={e => onImageFileChange(e, project.id)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative group w-full">
                <div className="relative w-full h-32 md:h-36 rounded-lg overflow-hidden border border-[rgb(var(--border))]">
                  <Image
                    src={project.pic_url}
                    alt={project.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <button
                  onClick={() => onEditImage(project.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 text-slate-600 hover:bg-white hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100 dark:bg-[rgb(var(--card))]/80 dark:text-[rgb(var(--text-muted))] dark:hover:bg-[rgb(var(--card))] dark:hover:text-[rgb(var(--text))]"
                  title="编辑图片"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="col-span-12 md:col-span-9 lg:col-span-9">
          <div className="space-y-4">
            {/* 第一行：标题和类型 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 项目标题 */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">项目名称</p>
                {project.editingTitle ? (
                  <div className="flex gap-2">
                    <input
                      value={localValues.title || ''}
                      onChange={e => onLocalInputChange(projectId, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <button
                      onClick={() => onSaveTitle(project.id)}
                      className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onCancelEditTitle(project.id)}
                      className="px-3 py-2 rounded bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h3 className="text-base sm:text-lg font-medium text-[rgb(var(--text))] truncate">
                      {project.title}
                    </h3>
                    <button
                      onClick={() => onEditTitle(project.id)}
                      className="p-1 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑标题"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 项目类型 */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">项目类型</p>
                <select
                  value={project.type}
                  onChange={e => onTypeChange(project.id, Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                >
                  {PROJECT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 第二行：描述和链接 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 项目描述 */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">项目描述</p>
                {project.editingContent ? (
                  <div className="space-y-2">
                    <textarea
                      value={localValues.content || ''}
                      onChange={e => onLocalInputChange(projectId, 'content', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSaveContent(project.id)}
                        className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => onCancelEditContent(project.id)}
                        className="px-3 py-2 rounded bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <p className="text-sm text-[rgb(var(--text))] line-clamp-3">
                      {project.content}
                    </p>
                    <button
                      onClick={() => onEditContent(project.id)}
                      className="mt-1 p-1 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑描述"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 项目链接 */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">项目地址</p>
                {project.editingUrl ? (
                  <div className="space-y-2">
                    <input
                      value={localValues.url || ''}
                      onChange={e => onLocalInputChange(projectId, 'url', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSaveUrl(project.id)}
                        className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => onCancelEditUrl(project.id)}
                        className="px-3 py-2 rounded bg-[rgb(var(--muted))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <Link
                      href={project.url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] truncate"
                    >
                      {project.url}
                    </Link>
                    <button
                      onClick={() => onEditUrl(project.id)}
                      className="p-1 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors opacity-0 group-hover:opacity-100"
                      title="编辑链接"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 第三行：技术栈和操作按钮 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 技术栈 */}
              <LinkManager
                project={project}
                localInputValues={{ [projectId]: localValues }}
                onShowInput={onShowTagInput}
                onConfirmInput={onConfirmTagInput}
                onRemoveTag={onRemoveTag}
                onInputChange={onLocalInputChange}
              />

              {/* 操作按钮 */}
              <div className="flex items-end justify-end gap-2">
                <StatusBadge
                  recommend={project.recommend}
                  loading={updateRecommendLoading}
                  onClick={() => onToggleRecommend(project)}
                />

                <button
                  onClick={() => onDelete(project.id)}
                  className="px-4 py-2 rounded bg-red-100/60 text-red-600 hover:bg-red-100/80 transition-colors text-sm flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
