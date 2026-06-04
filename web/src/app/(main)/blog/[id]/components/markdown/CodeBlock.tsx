'use client'

import { useId, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ClipboardJS from 'clipboard'
import { Copy } from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'

interface CodeBlockProps {
  node?: any
  className?: string
  children: React.ReactNode
  [key: string]: any
}

export function CodeBlock({ node, className, children, ...props }: CodeBlockProps) {
  const codeId = useId()
  const copyId = `copy-${codeId}`

  // 判断是否为行内代码
  const inline =
    node?.type === 'element' &&
    node?.tagName === 'code' &&
    !node?.properties?.className?.toString().includes('language-') &&
    node?.children?.length === 1 &&
    node?.children[0]?.type === 'text' &&
    node?.position?.start?.line === node?.position?.end?.line

  useEffect(() => {
    if (inline) return

    const clipboard = new ClipboardJS(`#${copyId}`, {
      text: () => (Array.isArray(children) ? children.join('') : String(children))
    })

    clipboard.on('success', () => {
      showAlert(BLOG_DETAIL_LABELS.CODE_COPIED)
    })

    return () => clipboard.destroy()
  }, [inline, copyId, children])

  if (inline) {
    return (
      <code
        className="bg-[rgb(var(--bg))] rounded px-1 py-0.5 blog-text-sm font-mono text-[rgb(var(--primary))]"
        {...props}
      >
        {children}
      </code>
    )
  }

  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'

  return (
    <div className="relative group">
      <SyntaxHighlighter
        style={dracula}
        language={language}
        PreTag="div"
        className="rounded-lg !bg-[#282a36] !p-4"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
      <button
        id={copyId}
        className="absolute top-2 right-2 p-2 bg-[rgb(var(--text))] hover:bg-[rgb(var(--primary))] rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
        title="复制代码"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}

export default CodeBlock
