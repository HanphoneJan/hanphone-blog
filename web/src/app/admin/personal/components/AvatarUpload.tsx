'use client'

import { ImageField } from '@/components/shared'

interface AvatarUploadProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function AvatarUpload({ value, onChange, disabled }: AvatarUploadProps) {
  return (
    <ImageField
      value={value}
      onChange={onChange}
      label="头像"
      namespace="blog/user"
      round
      previewSize={96}
      uploadText="更换头像"
      disabled={disabled}
    />
  )
}
