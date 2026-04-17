'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import type { EssayFile, FileInfo } from '../types'
import { getFileIconByType, getFileName } from '../utils'

interface FilePreviewProps {
  file: FileInfo | EssayFile
  isLocal: boolean
  index: number
  onDelete: (index: number, isLocal: boolean, fileName: string) => void
}

export function FilePreview({ file, isLocal, index, onDelete }: FilePreviewProps) {
  if (isLocal) {
    const localFile = file as FileInfo
    const FileIcon = getFileIconByType(localFile.type, localFile.file.name)

    return (
      <div className="relative rounded-lg overflow-hidden h-24 border border-blue-500/50 group">
        {localFile.type === 'IMAGE' ? (
          <Image
            src={localFile.previewUrl}
            alt={`待上传图片 ${index + 1}`}
            width={144}
            height={144}
            className="w-full h-full object-cover"
          />
        ) : localFile.type === 'VIDEO' ? (
          <video
            src={localFile.previewUrl}
            className="w-full h-full object-cover"
            controls={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[rgb(var(--hover))] p-2">
            <div className="text-[rgb(var(--primary))] mb-1">
              <FileIcon className="h-5 w-5" />
            </div>
            <span className="text-xs text-[rgb(var(--text))] truncate text-center">
              {localFile.file.name}
            </span>
          </div>
        )}
        <div className="absolute top-1 right-1 bg-blue-500/80 text-white text-xs px-1 rounded">
          待上传
        </div>
        <button
          type="button"
          onClick={() => onDelete(index, true, localFile.file.name)}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="删除文件"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>
    )
  }

  const uploadedFile = file as EssayFile
  const fileName = getFileName(uploadedFile)
  const FileIcon = getFileIconByType(uploadedFile.urlType, fileName)

  return (
    <div className="relative rounded-lg overflow-hidden h-24 border border-slate-300 dark:border-slate-700 group">
      {uploadedFile.urlType === 'IMAGE' ? (
        <Image
          src={uploadedFile.url}
          alt={`已上传图片 ${index + 1}`}
          width={144}
          height={144}
          className="w-full h-full object-cover"
        />
      ) : uploadedFile.urlType === 'VIDEO' ? (
        <video
          src={uploadedFile.url}
          className="w-full h-full object-cover"
          controls={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[rgb(var(--hover))] p-2">
          <div className="text-[rgb(var(--primary))] mb-1">
            <FileIcon className="h-5 w-5" />
          </div>
          <span className="text-xs text-[rgb(var(--text))] truncate text-center">
            {fileName}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => onDelete(index, false, fileName)}
        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        aria-label="删除文件"
      >
        <X className="h-5 w-5 text-white" />
      </button>
    </div>
  )
}
