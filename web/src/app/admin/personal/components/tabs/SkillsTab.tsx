'use client'

import { Code, Plus, Trash2, Edit3 } from 'lucide-react'
import { Skill } from '../../types'
import { getSkillIcon } from '../../utils'

interface SkillsTabProps {
  skills: Skill[]
  loading: boolean
  onAdd: () => void
  onEdit: (skill: Skill, index: number) => void
  onDelete: (index: number, id: number) => void
}

export function SkillsTab({ skills, loading, onAdd, onEdit, onDelete }: SkillsTabProps) {
  return (
    <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-b-xl shadow-sm border border-[rgb(var(--border))] border-t-0 overflow-hidden">
      <div className="py-3 px-6 border-b border-[rgb(var(--border))] flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[rgb(var(--primary))] flex items-center">
          <Code className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
          技能管理
        </h2>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white text-sm flex items-center transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加技能
        </button>
      </div>

      <div className="p-2 lg:p-4 min-h-[90vh]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-10 text-[rgb(var(--text-muted))]">暂无技能数据</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {skills.map((skill, index) => (
              <div
                key={skill.id}
                className="flex flex-col items-center text-center p-3 bg-[rgb(var(--card))] rounded-lg border border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))] transition-all duration-300 relative w-full max-w-[200px] mx-auto"
              >
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(index, skill.id)
                  }}
                  className="absolute top-2 right-2 text-[rgb(var(--text-muted))] hover:text-red-500 transition-colors"
                  aria-label="删除技能"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onEdit(skill, index)
                  }}
                  className="absolute top-2 left-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
                  aria-label="编辑技能"
                >
                  <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>

                <div className="w-16 h-16 bg-[rgb(var(--hover))] rounded-full shadow-md flex items-center justify-center mb-2 sm:mb-3 transition-all duration-300 hover:shadow-lg hover:scale-110">
                  {getSkillIcon(skill.icon_src)}
                </div>

                <h3 className="text-sm sm:text-base font-semibold mb-1 text-[rgb(var(--text))]">
                  {skill.name}
                </h3>

                <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))] line-clamp-2">{skill.desc}</p>

                {skill.url && (
                  <a
                    href={skill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    查看详情
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
