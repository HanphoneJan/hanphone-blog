'use client'

import { useMemo } from 'react'
import { FileImage, FileVideo, FileText, FileCode } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getFileType, getFileName } from '../utils'
import type { Essay, FileType } from '../types'

// 动态导入 ReactPlayer 避免 SSR 问题
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface FileGalleryProps {
  essay: Essay
  isMobile: boolean
  openFile: (url: string) => void
}

interface FileItem {
  url: string
  type: FileType
}

const MAX_DISPLAY_ITEMS = 9 // 最大直接展示数量

const getFileIcon = (type: FileType, fileName: string) => {
  if (type === 'image') return <FileImage className="h-4 w-4" />
  if (type === 'video') return <FileVideo className="h-4 w-4" />

  if (fileName.endsWith('.pdf')) return <FileText className="h-4 w-4" />
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FileText className="h-4 w-4" />
  if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return <FileText className="h-4 w-4" />
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) return <FileCode className="h-4 w-4" />

  return <FileText className="h-4 w-4" />
}

// 根据媒体文件数量计算网格列数
const getGridCols = (count: number, isMobile: boolean): number => {
  if (isMobile) {
    if (count === 1) return 1
    if (count === 2) return 2
    return 3
  } else {
    if (count === 1) return 1
    if (count === 2) return 2
    return 3
  }
}

// 图片项组件 - 容器有 maxHeight 限制，图片通过 max-width/max-height 约束且保持原始比例
const ImageItem = ({
  url,
  index,
  onClick,
  maxHeight
}: {
  url: string
  index: number
  onClick: () => void
  maxHeight: number
}) => {
  return (
    <div
      onClick={onClick}
      className="relative w-full cursor-pointer group overflow-hidden flex items-center justify-center"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      <Image
        src={url}
        alt={`图片 ${index + 1}`}
        width={0}
        height={0}
        sizes="100vw"
        loading={index < 4 ? 'eager' : 'lazy'}
        className="transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ display: 'block', maxWidth: '100%', maxHeight: `${maxHeight}px`, width: 'auto', height: 'auto' }}
      />
    </div>
  )
}

// 视频项组件 - 使用 ReactPlayer，带 maxHeight 限制
const VideoItem = ({
  url,
  onClick,
  maxHeight
}: {
  url: string
  onClick: () => void
  maxHeight: number
}) => {
  return (
    <div
      onClick={onClick}
      className="relative w-full cursor-pointer overflow-hidden"
      style={{ aspectRatio: '16/9', maxHeight: `${maxHeight}px`, minHeight: '140px' }}
    >
      {(ReactPlayer as any)({
        url,
        width: '100%',
        height: '100%',
        controls: true,
        style: { backgroundColor: 'transparent' },
        config: {
          file: {
            attributes: {
              style: {
                objectFit: 'contain',
                width: '100%',
                height: '100%'
              }
            }
          }
        }
      })}
    </div>
  )
}

export function FileGallery({ essay, isMobile, openFile }: FileGalleryProps) {
  // 合并所有文件
  const allFiles = useMemo<FileItem[]>(() => {
    const files: FileItem[] = [
      ...(essay.fileList?.Images.map(url => ({ url, type: 'image' as FileType })) || []),
      ...(essay.fileList?.Videos.map(url => ({ url, type: 'video' as FileType })) || []),
      ...(essay.fileList?.Texts.map(url => ({ url, type: 'text' as FileType })) || [])
    ]
    return files
  }, [essay.fileList])

  if (allFiles.length === 0) return null

  const textFiles = allFiles.filter(file => file.type === 'text')
  const mediaFiles = allFiles.filter(file => file.type !== 'text')
  const mediaCount = mediaFiles.length

  // 计算网格列数和图片最大高度
  const cols = getGridCols(Math.min(mediaCount, MAX_DISPLAY_ITEMS), isMobile)
  // 单列时给更大展示空间，多列时收紧高度避免竖长图撑高卡片
  const imageMaxHeight = cols === 1
    ? (isMobile ? 360 : 460)
    : (isMobile ? 180 : 220)
  const hasMoreMedia = mediaCount > MAX_DISPLAY_ITEMS
  const displayMediaFiles = mediaFiles.slice(0, MAX_DISPLAY_ITEMS)
  const remainingMediaCount = mediaCount - MAX_DISPLAY_ITEMS

  return (
    <div className="mb-4">
      {/* 媒体文件网格 - 容器大小由图片决定，无间隙 */}
      {mediaFiles.length > 0 && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 0
          }}
        >
          {displayMediaFiles.map((file, index) => (
            <div key={`media-${index}`} className="relative">
              {file.type === 'image' ? (
                <ImageItem
                  url={file.url}
                  index={index}
                  onClick={() => openFile(file.url)}
                  maxHeight={imageMaxHeight}
                />
              ) : (
                <VideoItem
                  url={file.url}
                  onClick={() => openFile(file.url)}
                  maxHeight={imageMaxHeight}
                />
              )}
              {/* 剩余数量遮罩 */}
              {index === MAX_DISPLAY_ITEMS - 1 && hasMoreMedia && (
                <div
                  className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                  onClick={() => openFile(file.url)}
                >
                  <span className="text-white text-2xl font-bold">+{remainingMediaCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 文本文件 - 紧凑平铺布局 */}
      {textFiles.length > 0 && (
        <div
          className="grid overflow-hidden"
          style={{
            gridTemplateColumns: isMobile
              ? '1fr'
              : textFiles.length === 1
                ? '1fr'
                : textFiles.length === 2
                  ? 'repeat(2, 1fr)'
                  : 'repeat(3, 1fr)',
            gap: 0
          }}
        >
          {textFiles.map((file, index) => (
            <div
              key={`text-${index}`}
              onClick={() => openFile(file.url)}
              className="bg-[rgb(var(--muted))] flex items-center gap-2 cursor-pointer hover:bg-[rgb(var(--muted)/0.85)] transition-colors overflow-hidden p-2"
              style={{ minHeight: '44px' }}
            >
              <div className="text-[rgb(var(--primary))] p-1 bg-[rgb(var(--primary)/0.1)] rounded shrink-0">
                {getFileIcon('text', file.url)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[rgb(var(--card-foreground))] truncate leading-tight">
                  {getFileName(file.url)}
                </div>
                <div className="text-[10px] text-[rgb(var(--muted-foreground))] leading-tight">点击查看</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileGallery
