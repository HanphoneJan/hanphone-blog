'use client'

import { useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import Link from 'next/link'
import { Project } from '../types'

interface LinkManagerProps {
  project: Project
  localInputValues: { [key: number]: { techInput?: string } }
  onShowInput: (projectId: number | null) => void
  onConfirmInput: (project: Project) => void
  onRemoveTag: (index: number, project: Project) => void
  onInputChange: (projectId: number, field: string, value: string) => void
}

export const LinkManager = ({
  project,
  localInputValues,
  onShowInput,
  onConfirmInput,
  onRemoveTag,
  onInputChange
}: LinkManagerProps) => {
  const tagInputRef = useRef<HTMLInputElement>(null)
  const projectId = project.id

  useEffect(() => {
    if (project.inputVisible && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [project.inputVisible])

  if (!projectId) return null

  const localValues = localInputValues[projectId] || {}
  const tags = project.techs ? project.techs.split(',').filter(Boolean) : []

  return (
    <div className="flex items-center gap-2">
      <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))] whitespace-nowrap">
        技术栈
      </p>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--text))] text-xs"
          >
            {tag}
            <X
              className="h-3 w-3 cursor-pointer hover:text-red-500"
              onClick={() => onRemoveTag(i, project)}
            />
          </span>
        ))}
        {project.inputVisible ? (
          <input
            ref={tagInputRef}
            value={localValues.techInput || ''}
            onChange={e => onInputChange(projectId, 'techInput', e.target.value)}
            onBlur={() => onConfirmInput(project)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onConfirmInput(project)
              }
            }}
            className="w-20 px-2 py-1 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
          />
        ) : (
          <span
            onClick={() => onShowInput(projectId)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] cursor-pointer text-xs"
          >
            <Plus className="h-3 w-3" />
            添加
          </span>
        )}
      </div>
    </div>
  )
}

export default LinkManager
