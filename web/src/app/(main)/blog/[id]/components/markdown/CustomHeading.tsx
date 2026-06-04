'use client'

import { JSX, useMemo, useRef, useEffect } from 'react'
import { slugify, extractTextFromChildren } from '@/lib/slugify'

// 全局存储已使用的 heading IDs，处理重复标题
const usedHeadingIds = new Set<string>()

interface CustomHeadingProps {
  level: number
  children: React.ReactNode
  node?: any
  [key: string]: any
}

export function CustomHeading({ level, children, node, ...props }: CustomHeadingProps) {
  const idRef = useRef<string>('')

  const id = useMemo(() => {
    // 如果已经生成过 ID，直接返回
    if (idRef.current) return idRef.current

    const text = extractTextFromChildren(children)
    let baseId = slugify(text)

    // 如果文本为空，使用备用 ID
    if (!baseId) {
      baseId = `heading-${level}`
    }

    // 确保 ID 不以数字开头（HTML ID 规范）
    if (/^\d/.test(baseId)) {
      baseId = 'h-' + baseId
    }

    // 处理重复 ID
    let finalId = baseId
    let counter = 1
    while (usedHeadingIds.has(finalId)) {
      finalId = `${baseId}-${counter}`
      counter++
    }

    usedHeadingIds.add(finalId)
    idRef.current = finalId
    return finalId
  }, [children, level])

  // 组件卸载时清理（可选，如果需要支持重新渲染时复用 ID）
  useEffect(() => {
    return () => {
      // 可以选择在这里移除 ID，允许复用
      // usedHeadingIds.delete(idRef.current)
    }
  }, [])

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <HeadingTag id={id} className="scroll-mt-24" {...props}>
      {children}
    </HeadingTag>
  )
}

export default CustomHeading
