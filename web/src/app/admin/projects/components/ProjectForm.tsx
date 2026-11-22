'use client'

import { Loader2 } from 'lucide-react'
import { PROJECT_TYPES } from '../utils'
import { ProjectFormData } from '../types'
import { ImageField } from '@/components/shared/ImageField'

interface ProjectFormProps {
  formData: ProjectFormData
  dialogImageUrl: string
  loading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onImageUrlChange: (url: string) => void
  onSubmit: () => void
}

export const ProjectForm = ({
  formData,
  dialogImageUrl,
  loading,
  onInputChange,
  onImageUrlChange,
  onSubmit
}: ProjectFormProps) => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">项目名称</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入项目名称"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">项目类型</label>
        <select
          name="type"
          value={formData.type}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
        >
          {PROJECT_TYPES.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">项目描述</label>
        <textarea
          name="content"
          value={formData.content}
          onChange={onInputChange}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入项目描述"
        ></textarea>
      </div>

      <ImageField
        value={dialogImageUrl}
        onChange={onImageUrlChange}
        namespace="blog/project"
        label="项目封面"
        aspectRatio={16 / 9}
        hint="上传本地图片或填入图片地址，二者选其一即可。"
      />

      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">技术栈（用英文逗号分隔）</label>
        <input
          type="text"
          name="techs"
          value={formData.techs}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入技术栈"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">项目地址</label>
        <input
          type="text"
          name="url"
          value={formData.url}
          onChange={onInputChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="请输入项目地址"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white transition-colors flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          发布项目
        </button>
      </div>
    </div>
  )
}

export default ProjectForm
