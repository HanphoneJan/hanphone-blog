'use client'

import { Folder, Star, Briefcase, Wrench, Gamepad2, Code } from 'lucide-react'
import { ProjectStats as ProjectStatsType } from '../types'
import { PROJECT_TYPES } from '../utils'

interface ProjectStatsProps {
  stats: ProjectStatsType
}

const iconMap: Record<string, React.ElementType> = {
  folder: Folder,
  star: Star,
  briefcase: Briefcase,
  tool: Wrench,
  gamepad: Gamepad2,
  code: Code,
  file: Folder
}

export const ProjectStats = ({ stats }: ProjectStatsProps) => {
  const cards = [
    {
      label: '项目总数',
      value: stats.total,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50 text-blue-600',
      icon: Folder
    },
    {
      label: '已推荐',
      value: stats.recommended,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50 text-yellow-600',
      icon: Star
    },
    ...PROJECT_TYPES.filter(type => type.id !== 0).map(type => ({
      label: type.name,
      value: stats.byType[type.id] || 0,
      color: getTypeColor(type.id),
      lightColor: getTypeLightColor(type.id),
      icon: getTypeIcon(type.id)
    }))
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={index}
            className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.lightColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--text-muted))]">{card.label}</p>
                <p className="text-lg font-semibold text-[rgb(var(--text))]">{card.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const getTypeColor = (typeId: number): string => {
  const colors: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-green-500',
    3: 'bg-purple-500',
    4: 'bg-orange-500'
  }
  return colors[typeId] || 'bg-gray-500'
}

const getTypeLightColor = (typeId: number): string => {
  const colors: Record<number, string> = {
    1: 'bg-blue-50 text-blue-600',
    2: 'bg-green-50 text-green-600',
    3: 'bg-purple-50 text-purple-600',
    4: 'bg-orange-50 text-orange-600'
  }
  return colors[typeId] || 'bg-gray-50 text-gray-600'
}

const getTypeIcon = (typeId: number): React.ElementType => {
  const icons: Record<number, React.ElementType> = {
    1: Briefcase,
    2: Wrench,
    3: Gamepad2,
    4: Code
  }
  return icons[typeId] || Folder
}

export default ProjectStats
