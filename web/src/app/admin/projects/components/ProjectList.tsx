'use client'

import { Search, AlertCircle } from 'lucide-react'
import { Project, ProjectFilters } from '../types'
import { PROJECT_TYPES } from '../utils'
import ProjectCard from './ProjectCard'
import ProjectStats from './ProjectStats'
import { ProjectStats as ProjectStatsType } from '../types'

interface ProjectListProps {
  projects: Project[]
  filteredList: Project[]
  loading: boolean
  filters: ProjectFilters
  localInputValues: { [key: number]: { title?: string; content?: string; imageUrl?: string; url?: string; techInput?: string } }
  stats: ProjectStatsType
  updateRecommendLoading: number | null
  imageUploadRef: React.RefObject<HTMLInputElement | null>
  onFilterChange: (name: keyof ProjectFilters, value: any) => void
  onResetFilters: () => void
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

export const ProjectList = ({
  projects,
  filteredList,
  loading,
  filters,
  localInputValues,
  stats,
  updateRecommendLoading,
  imageUploadRef,
  onFilterChange,
  onResetFilters,
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
}: ProjectListProps) => {
  return (
    <div className="px-0 md:px-6 md:py-3 overflow-x-auto">
      {/* 统计面板 */}
      <ProjectStats stats={stats} />

      {/* 筛选区域 */}
      <div className="md:mb-4 p-3 bg-[rgb(var(--card))] lg:rounded-lg border border-[rgb(var(--border))]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="block text-xs text-[rgb(var(--text-muted))]">项目类型</label>
            <select
              value={filters.type}
              onChange={e => onFilterChange('type', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            >
              <option value={-1}>全部类型</option>
              {PROJECT_TYPES.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-[rgb(var(--text-muted))]">推荐状态</label>
            <select
              value={filters.status}
              onChange={e => onFilterChange('status', e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            >
              <option value="all">全部状态</option>
              <option value="recommended">已推荐</option>
              <option value="unrecommended">未推荐</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-[rgb(var(--text-muted))]">排序方式</label>
            <select
              value={filters.sortBy}
              onChange={e => onFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            >
              <option value="created">创建时间</option>
              <option value="name">项目名称</option>
              <option value="progress">项目类型</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-[rgb(var(--text-muted))]">标题搜索</label>
            <div className="relative">
              <input
                type="text"
                value={filters.searchQuery}
                onChange={e => onFilterChange('searchQuery', e.target.value)}
                placeholder="输入项目标题关键词搜索..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-muted))]" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-between items-center">
          <div className="text-xs text-[rgb(var(--text-muted))]">
            共 {filteredList.length} 个项目（筛选自 {projects.length} 个项目）
          </div>

          <button
            onClick={onResetFilters}
            className="px-3 py-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
          >
            重置筛选
          </button>
        </div>
      </div>

      {loading ? (
        // 加载状态骨架屏
        <div className="space-y-3 h-[400px] flex flex-col justify-center">
          {[1, 2, 3, 4, 5].map(item => (
            <div key={item} className="animate-pulse bg-[rgb(var(--hover))] rounded-lg h-48"></div>
          ))}
        </div>
      ) : filteredList.length > 0 ? (
        <div className="space-y-4">
          {filteredList.map((project) => {
            const projectId = project.id
            if (!projectId) return null

            return (
              <ProjectCard
                key={project.id}
                project={project}
                localValues={localInputValues[projectId] || {}}
                updateRecommendLoading={updateRecommendLoading === project.id}
                imageUploadRef={imageUploadRef}
                onEditTitle={onEditTitle}
                onSaveTitle={onSaveTitle}
                onCancelEditTitle={onCancelEditTitle}
                onEditContent={onEditContent}
                onSaveContent={onSaveContent}
                onCancelEditContent={onCancelEditContent}
                onEditImage={onEditImage}
                onSaveImage={onSaveImage}
                onCancelEditImage={onCancelEditImage}
                onEditUrl={onEditUrl}
                onSaveUrl={onSaveUrl}
                onCancelEditUrl={onCancelEditUrl}
                onLocalInputChange={onLocalInputChange}
                onTypeChange={onTypeChange}
                onImageFileChange={onImageFileChange}
                onShowTagInput={onShowTagInput}
                onConfirmTagInput={onConfirmTagInput}
                onRemoveTag={onRemoveTag}
                onToggleRecommend={onToggleRecommend}
                onDelete={onDelete}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 min-h-[90vh]">
          <AlertCircle className="mx-auto h-12 w-12 text-[rgb(var(--text-muted))] mb-4" />
          <p className="text-[rgb(var(--text-muted))]">暂无项目数据</p>
        </div>
      )}
    </div>
  )
}

export default ProjectList
