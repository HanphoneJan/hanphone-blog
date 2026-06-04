/**
 * 分类筛选组件
 */

import Image from 'next/image'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TypeSkeletonList } from './TypeSkeleton'
import type { Type } from '../types'

interface TypeFilterProps {
  types: Type[]
  selectedTypeId: number | null
  loading: boolean
  visible: boolean
  showTypes: boolean
  moreType: boolean
  onToggleShow: () => void
  onSelectType: (id: number) => void
  onToggleMore: () => void
  isMobile?: boolean
}

export function TypeFilter({
  types,
  selectedTypeId,
  loading,
  visible,
  showTypes,
  moreType,
  onToggleShow,
  onSelectType,
  onToggleMore,
  isMobile = false
}: TypeFilterProps) {
  const buttonClass = isMobile
    ? 'w-full flex justify-between items-center font-medium mb-3 text-[rgb(var(--orange))] hover:bg-[rgb(var(--orange)/0.1)] px-2 py-1.5 rounded-lg transition-all'
    : 'w-full flex justify-between items-center font-medium mb-3 text-[rgb(var(--orange))] hover:bg-[rgb(var(--orange)/0.1)] px-2 py-1.5 rounded-lg transition-all'

  const listClass = isMobile
    ? 'space-y-1 min-h-[30vh] max-h-[60vh] overflow-y-auto pr-2'
    : 'space-y-1 mb-2'

  const itemClass = (isSelected: boolean) =>
    isMobile
      ? `flex justify-between items-center p-2.5 rounded-lg cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-sm ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] border-[rgb(var(--primary)/0.3)] shadow-md'
            : 'hover:bg-[rgb(var(--primary)/0.05)] border-[rgb(var(--border)/0.3)]'
        }`
      : `flex justify-between items-center p-2.5 rounded-lg cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-sm ${
          isSelected
            ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] border-[rgb(var(--primary)/0.3)]'
            : 'hover:bg-[rgb(var(--primary)/0.05)] border-[rgb(var(--border)/0.3)]'
        }`

  return (
    <div className={isMobile ? 'p-4 border-b border-[rgb(var(--border))]' : 'mb-5'}>
      <button onClick={onToggleShow} className={buttonClass}>
        <span>分类</span>
        {showTypes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {showTypes && (
        <ul className={listClass}>
          {loading ? (
            <TypeSkeletonList count={isMobile ? 8 : 5} />
          ) : (
            <div
              className={`transition-all duration-500 ${
                visible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {types.map((type) => {
                const isSelected = type.id === selectedTypeId
                return (
                  <li
                    key={type.id}
                    onClick={() => onSelectType(type.id)}
                    className={itemClass(isSelected)}
                  >
                    <div className="flex items-center">
                      <div
                        className={`relative h-6 w-6 rounded-full overflow-hidden mr-2 border ${
                          isSelected
                            ? 'border-[rgb(var(--primary)/0.3)]'
                            : 'border-[rgb(var(--border))]'
                        }`}
                      >
                        <Image
                          src={type.pic_url}
                          alt={type.name}
                          fill
                          loading="eager"
                          priority={true}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <span
                        className={
                          isSelected
                            ? 'text-[rgb(var(--primary))]'
                            : 'text-[rgb(var(--text))]'
                        }
                      >
                        {type.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]'
                          : 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                      }`}
                    >
                      {type.blogs.length}
                    </span>
                  </li>
                )
              })}
            </div>
          )}
          <li
            onClick={onToggleMore}
            className={
              isMobile
                ? 'flex justify-center items-center p-2 text-sm text-[rgb(var(--orange))] cursor-pointer hover:bg-[rgb(var(--orange)/0.1)] rounded-lg transition-all duration-300 hover:scale-105 mt-2 font-medium'
                : 'flex justify-center items-center p-2 text-sm text-[rgb(var(--primary))] cursor-pointer hover:bg-[rgb(var(--primary)/0.05)] rounded mt-1'
            }
          >
            {moreType ? (
              <>
                查看更多 <ChevronDown className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                收起 <ChevronUp className="ml-1 h-4 w-4" />
              </>
            )}
          </li>
        </ul>
      )}
    </div>
  )
}
