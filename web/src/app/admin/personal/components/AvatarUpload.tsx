'use client'

import Image from 'next/image'
import { Upload } from 'lucide-react'
import { ASSETS } from '@/lib/constants'

interface AvatarUploadProps {
  imageUrl: string
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AvatarUpload({ imageUrl, onFileUpload }: AvatarUploadProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[rgb(var(--border))]">
          <Image
            src={imageUrl || ASSETS.DEFAULT_AVATAR}
            alt="预览头像"
            width={128}
            height={128}
            className="object-cover"
          />
        </div>
      </div>
      <div>
        <label className="flex items-center justify-center w-full px-4 py-2 border border-[rgb(var(--border))] rounded-lg cursor-pointer bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors">
          <Upload className="h-4 w-4 mr-2" />
          <span>选择图片</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={onFileUpload}
          />
        </label>
      </div>
    </div>
  )
}
