'use client'

import { Plus, X, Upload as UploadIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { PROJECT_TYPES } from '../utils'
import { ProjectFormData } from '../types'

interface ProjectFormProps {
  formData: ProjectFormData
  dialogImageUrl: string
  loading: boolean
  uploadRef: React.RefObject<HTMLInputElement | null>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onSubmit: () => void
}

export const ProjectForm = ({
  formData,
  dialogImageUrl,
  loading,
  uploadRef,
  onInputChange,
  onFileChange,
  onRemoveImage,
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

      <div className="space-y-2">
        <label className="block text-sm text-[rgb(var(--text))]">项目图片</label>
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="w-40 h-40 rounded-lg border-2 border-dashed border-[rgb(var(--border))] flex items-center justify-center cursor-pointer hover:border-[rgb(var(--primary))] transition-colors"
            onClick={() => uploadRef.current?.click()}
          >
            {dialogImageUrl ? (
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                <Image
                  src={dialogImageUrl}
                  alt="项目图片预览"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="text-center">
                <UploadIcon className="h-8 w-8 mx-auto text-[rgb(var(--text-muted))]" />
                <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">上传</p>
              </div>
            )}
          </div>

          {dialogImageUrl && (
            <div className="flex gap-2">
              <button
                onClick={onRemoveImage}
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                移除
              </button>
            </div>
          )}
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
          图片将自动压缩为JPEG格式，最大尺寸1200x1200px，保持原始文件名
        </p>
      </div>

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
