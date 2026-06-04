import { useMemo } from 'react'
import { Project, ProjectStats } from '../types'
import { PROJECT_TYPES } from '../utils'

export const useProjectStats = (projects: Project[]): ProjectStats => {
  return useMemo(() => {
    const stats: ProjectStats = {
      total: projects.length,
      byType: {},
      recommended: 0
    }

    // 初始化各类型计数为0
    PROJECT_TYPES.forEach(type => {
      stats.byType[type.id] = 0
    })

    // 统计各类型数量
    projects.forEach(project => {
      if (stats.byType[project.type] !== undefined) {
        stats.byType[project.type]++
      }
      if (project.recommend) {
        stats.recommended++
      }
    })

    return stats
  }, [projects])
}

// 获取统计卡片数据
export const useStatsCards = (stats: ProjectStats) => {
  return useMemo(() => {
    const cards = [
      {
        label: '项目总数',
        value: stats.total,
        color: 'bg-blue-500',
        icon: 'folder'
      },
      {
        label: '已推荐',
        value: stats.recommended,
        color: 'bg-yellow-500',
        icon: 'star'
      },
      ...PROJECT_TYPES.filter(type => type.id !== 0).map(type => ({
        label: type.name,
        value: stats.byType[type.id] || 0,
        color: getTypeColor(type.id),
        icon: getTypeIcon(type.id)
      }))
    ]

    return cards
  }, [stats])
}

// 辅助函数
const getTypeColor = (typeId: number): string => {
  const colors: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-green-500',
    3: 'bg-purple-500',
    4: 'bg-orange-500'
  }
  return colors[typeId] || 'bg-gray-500'
}

const getTypeIcon = (typeId: number): string => {
  const icons: Record<number, string> = {
    1: 'briefcase',
    2: 'tool',
    3: 'gamepad',
    4: 'code'
  }
  return icons[typeId] || 'file'
}
