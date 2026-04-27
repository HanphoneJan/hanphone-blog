'use client'

import Image from 'next/image'
import { BookOpen, Plus, Trash2, Edit3 } from 'lucide-react'
import { Work } from '../../types'
import { getIcon } from '../../utils'

interface WorksTabProps {
  works: Work[]
  loading: boolean
  onAdd: () => void
  onEdit: (work: Work, index: number) => void
  onDelete: (index: number, id: number) => void
}

export function WorksTab({ works, loading, onAdd, onEdit, onDelete }: WorksTabProps) {
  return (
    <div className="bg-[rgb(var(--card))] backdrop-blur-sm rounded-b-xl shadow-sm border border-[rgb(var(--border))] border-t-0 overflow-hidden">
      <div className="py-3 px-6 border-b border-[rgb(var(--border))] flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[rgb(var(--primary))] flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-[rgb(var(--primary))]" />
          作品管理
        </h2>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white text-sm flex items-center transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加作品
        </button>
      </div>

      <div className="p-2 lg:p-4 min-h-[90vh]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-10 text-[rgb(var(--text-muted))]">暂无作品数据</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {works.map((work, index) => (
              <div
                key={work.id}
                className="bg-[rgb(var(--card))] rounded-xl border border-[rgb(var(--border))] overflow-hidden transition-all duration-300 hover:bg-[rgb(var(--hover))] hover:shadow-lg relative w-full max-w-[240px] mx-auto"
              >
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(index, work.id)
                  }}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-slate-300 hover:text-red-500 transition-colors z-10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onEdit(work, index)
                  }}
                  className="absolute top-2 left-2 bg-black/50 rounded-full p-1 text-slate-300 hover:text-[rgb(var(--primary))] transition-colors z-10"
                >
                  <Edit3 className="h-3 w-3" />
                </button>

                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-32 overflow-hidden relative"
                >
                  <Image
                    src={work.pic_url || '/default-image.png'}
                    alt={work.name}
                    fill
                    className="object-cover w-full h-full transition-transform duration-700 hover:scale-110"
                  />
                </a>
                <div className="p-3">
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-[rgb(var(--primary))]">{getIcon(work.icon_src)}</span>
                    <h3 className="text-sm sm:text-base font-semibold text-[rgb(var(--text))]">
                      {work.name}
                    </h3>
                  </div>
                  <p className="text-[rgb(var(--text-muted))] text-xs sm:text-sm line-clamp-2">
                    {work.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
