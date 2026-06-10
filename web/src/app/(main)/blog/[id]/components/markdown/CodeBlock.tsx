'use client'

import { useId, useEffect, useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ClipboardJS from 'clipboard'
import { Copy, Check } from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { BLOG_DETAIL_LABELS } from '@/lib/labels'

interface CodeBlockProps {
  node?: any
  className?: string
  children: React.ReactNode
  [key: string]: any
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'JavaScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  py: 'Python', rb: 'Ruby', rs: 'Rust', go: 'Go',
  java: 'Java', kt: 'Kotlin', swift: 'Swift',
  c: 'C', cpp: 'C++', cs: 'C#', php: 'PHP',
  html: 'HTML', css: 'CSS', scss: 'SCSS',
  sql: 'SQL', sh: 'Shell', bash: 'Bash', zsh: 'Zsh',
  yaml: 'YAML', yml: 'YAML', json: 'JSON', xml: 'XML',
  md: 'Markdown', dockerfile: 'Dockerfile',
  text: 'plain text', plaintext: 'plain text',
}

/**
 * 递归提取 React children 中的纯文本
 * react-markdown 配合 rehype-raw 时，代码块 children 可能是
 * string | string[] | ReactElement | (string | ReactElement)[]
 * String() 对数组会插入逗号，导致正则失效，所以必须递归拼接。
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (node == null) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as any).props.children)
  }
  return ''
}

export function CodeBlock({ node, className, children, ...props }: CodeBlockProps) {
  const codeId = useId()
  const copyId = `copy-${codeId}`
  const [copied, setCopied] = useState(false)

  const inline =
    node?.type === 'element' &&
    node?.tagName === 'code' &&
    !node?.properties?.className?.toString().includes('language-') &&
    node?.children?.length === 1 &&
    node?.children[0]?.type === 'text' &&
    node?.position?.start?.line === node?.position?.end?.line

  const handleCopied = useCallback(() => {
    setCopied(true)
    showAlert(BLOG_DETAIL_LABELS.CODE_COPIED)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => {
    if (inline) return
    const clipboard = new ClipboardJS(`#${copyId}`, {
      text: () => extractText(children)
    })
    clipboard.on('success', handleCopied)
    return () => clipboard.destroy()
  }, [inline, copyId, children, handleCopied])

  if (inline) {
    return (
      <code className="bg-[rgb(var(--code-bg))] text-[rgb(var(--code-text))] rounded px-1.5 py-0.5 blog-text-sm font-mono" {...props}>
        {children}
      </code>
    )
  }

  const match = /language-(\w+)/.exec(className || '')
  const langKey = match ? match[1] : 'text'
  const language = LANGUAGE_ALIASES[langKey] || langKey

  // 递归提取纯文本后去除首尾换行
  const codeStr = extractText(children).replace(/^\n+/, '').replace(/\n+$/, '')
  const lineCount = codeStr === '' ? 0 : codeStr.split('\n').length

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-[rgb(var(--border))] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[rgb(var(--muted))] border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] font-medium text-[rgb(var(--muted-foreground))] tracking-wide select-none">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[rgb(var(--muted-foreground))]/60 select-none tabular-nums">
            {lineCount} 行
          </span>
          <button
            id={copyId}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all duration-200 ${
              copied
                ? 'text-green-500 bg-green-500/10'
                : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--card))]'
            }`}
            title="复制代码"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" /><span>已复制</span></>
            ) : (
              <><Copy className="h-3.5 w-3.5" /><span>复制</span></>
            )}
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        style={dracula}
        language={langKey}
        PreTag="div"
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#6272a4',
          textAlign: 'right',
          userSelect: 'none',
          fontSize: '0.85rem',
        }}
        customStyle={{
          margin: 0,
          padding: '1.25rem 0',
          borderRadius: 0,
          background: '#282a36',
          fontSize: '0.875rem',
          lineHeight: '1.7',
        }}
        codeTagProps={{
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          }
        }}
        wrapLines
        lineProps={() => ({ style: { display: 'block', padding: '0 1rem' } })}
        {...props}
      >
        {codeStr}
      </SyntaxHighlighter>
    </div>
  )
}

export default CodeBlock
