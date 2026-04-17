'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface CustomImageProps {
  src?: string
  alt?: string
  [key: string]: any
}

export function CustomImage({ src, alt, ...props }: CustomImageProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="bg-[rgb(var(--border)/0.2)] animate-pulse rounded-lg h-64 w-full" />
    )
  }

  if (!src || (!src.startsWith('http://') && !src.startsWith('https://'))) {
    return (
      <div className="text-[rgb(var(--error))] blog-text-sm p-4 border border-[rgb(var(--error)/0.3)] rounded">
        图片URL必须是绝对路径: {src}
      </div>
    )
  }

  return (
    <div className="relative w-full my-2 overflow-hidden rounded-lg">
      <Image
        src={src}
        alt={alt || '图片'}
        width={800}
        height={450}
        className="object-cover w-full h-auto"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
        {...props}
      />
    </div>
  )
}

export default CustomImage
