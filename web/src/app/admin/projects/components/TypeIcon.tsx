'use client'

import { Briefcase, Wrench, Gamepad2, Code, Folder, FileQuestion } from 'lucide-react'
import { getTypeName, getTypeStyle } from '../utils'

interface TypeIconProps {
  typeId: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const iconMap = {
  0: Folder,
  1: Briefcase,
  2: Wrench,
  3: Gamepad2,
  4: Code
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export const TypeIcon = ({ typeId, showLabel = true, size = 'sm' }: TypeIconProps) => {
  const Icon = iconMap[typeId as keyof typeof iconMap] || FileQuestion
  const sizeClass = sizeMap[size]

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeStyle(typeId)}`}>
        <Icon className={sizeClass} />
        {getTypeName(typeId)}
      </span>
    )
  }

  return <Icon className={`${sizeClass} ${getTypeStyle(typeId)}`} />
}

export default TypeIcon
