'use client'

import { Plus } from 'lucide-react'
import type { EssayFile, FileInfo } from '../types'
import { MAX_FILE_COUNT } from '../utils'
import { FilePreview } from './FilePreview'

interface FileUploadProps {
  localFiles: FileInfo[]
  uploadedFiles: EssayFile[]
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, uploadedFileCount: number) => void
  onOpenDeleteModal: (index: number, isLocal: boolean, fileName: string) => void
}

export function FileUpload({
  localFiles,
  uploadedFiles,
  onFileSelect,
  onOpenDeleteModal
}: FileUploadProps) {
  const totalCount = localFiles.length + uploadedFiles.length

  return (
    <div>
      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
        文件 ({totalCount}/{MAX_FILE_COUNT})
        <span className="text-xs text-[rgb(var(--muted))] ml-2">
          支持图片、视频、PDF、Word、PPT、MD等格式
        </span>
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {/* 上传按钮 */}
        {totalCount < MAX_FILE_COUNT && (
          <label className="border-2 border-dashed border-[rgb(var(--border))] rounded-lg p-4 h-24 flex flex-col items-center justify-center text-[rgb(var(--muted))] hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))] cursor-pointer transition-colors">
            <Plus className="h-6 w-6 mb-1" />
            <span className="text-xs">添加文件</span>
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.md,.txt"
              multiple
              onChange={e => onFileSelect(e, uploadedFiles.length)}
              className="hidden"
            />
          </label>
        )}

        {/* 已选择的本地文件（未上传） */}
        {localFiles.map((file, index) => (
          <FilePreview
            key={`local-${index}`}
            file={file}
            isLocal={true}
            index={index}
            onDelete={onOpenDeleteModal}
          />
        ))}

        {/* 已上传的文件 */}
        {uploadedFiles.map((file, index) => (
          <FilePreview
            key={`uploaded-${file.id}-${index}`}
            file={file}
            isLocal={false}
            index={index}
            onDelete={onOpenDeleteModal}
          />
        ))}
      </div>
    </div>
  )
}
