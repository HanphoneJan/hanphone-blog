'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeHighlighterProps {
  language: string
  code: string
  [key: string]: any
}

export function CodeHighlighter({ language, code, ...props }: CodeHighlighterProps) {
  return (
    <SyntaxHighlighter
      style={dracula}
      language={language}
      PreTag="div"
      showLineNumbers
      lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6272a4', textAlign: 'right', userSelect: 'none', fontSize: '0.85rem' }}
      customStyle={{ margin: 0, padding: '1.25rem 0', borderRadius: 0, background: '#282a36', fontSize: '0.875rem', lineHeight: '1.7' }}
      codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" } }}
      wrapLines
      lineProps={() => ({ style: { display: 'block', padding: '0 1rem' } })}
      {...props}
    >
      {code}
    </SyntaxHighlighter>
  )
}

export default CodeHighlighter