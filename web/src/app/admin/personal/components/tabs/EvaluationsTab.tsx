'use client'

import { MessageSquare, Plus, Trash2, Edit3 } from 'lucide-react'
import { Evaluation } from '../../types'

interface EvaluationsTabProps {
  evaluations: Evaluation[]
  loading: boolean
  onAdd: () => void
  onEdit: (evaluation: Evaluation, index: number) => void
  onDelete: (index: number, id: number) => void
}

export function EvaluationsTab({ evaluations, loading, onAdd, onEdit, onDelete }: EvaluationsTabProps) {
  return (
    <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-b-xl shadow-sm border border-[rgb(var(--border))] border-t-0 overflow-hidden">
      <div className="py-3 px-6 border-b border-[rgb(var(--border))] flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[rgb(var(--primary))] flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
          个人评价管理
        </h2>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white text-sm flex items-center transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加评价
        </button>
      </div>

      <div className="p-2 lg:p-4 min-h-[90vh]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-10 text-[rgb(var(--text-muted))]">暂无评价数据</div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((evaluation, index) => (
              <div
                key={evaluation.id}
                className="bg-[rgb(var(--card))] rounded-lg border border-[rgb(var(--border))] p-3 relative hover:bg-[rgb(var(--hover))] transition-all duration-300"
              >
                <button
                  onClick={() => onDelete(index, evaluation.id)}
                  className="absolute top-3 right-3 text-[rgb(var(--text-muted))] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(evaluation, index)}
                  className="absolute top-3 right-10 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <p className="text-[rgb(var(--text))] leading-relaxed pl-2 border-l-2 border-[rgb(var(--primary))]">
                  {evaluation.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
