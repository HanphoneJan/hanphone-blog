'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, List, X, FileText, FileCode, FileJson, File, BookOpen, Folder, FolderOpen } from 'lucide-react'
import type { DocMeta, DocData } from '../../lib/docLoader'
import ModalOverlay from '@/components/shared/ModalOverlay'

// 动画变体定义
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  }
}

const mobileSidebarVariants: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200
    }
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

const desktopSidebarVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.1
    }
  }
}

const fabVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

const treeItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 }
  }
}

// ============ 类型定义 ============

const typeIcons: Record<string, React.ElementType> = {
  '.docx': FileText,
  '.pdf': File,
  '.md': FileCode,
  '.html': FileJson,
  docx: FileText,
  pdf: File,
  md: FileCode,
  html: FileJson,
}

// ============ 树节点类型 ============

interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  doc?: DocMeta
  children: TreeNode[]
}

// ============ 构建树（与 DocsClient 一致） ============

function buildTree(docs: DocMeta[]): TreeNode {
  const root: TreeNode = { name: '文档中心', path: '', isFolder: true, children: [] }

  for (const doc of docs) {
    const parts = doc.filename.split('/')
    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i]
      const folderPath = parts.slice(0, i + 1).join('/')
      let child = current.children.find(c => c.isFolder && c.name === folderName)
      if (!child) {
        child = { name: folderName, path: folderPath, isFolder: true, children: [] }
        current.children.push(child)
      }
      current = child
    }
    const fileName = parts[parts.length - 1]
    current.children.push({
      name: fileName,
      path: doc.filename,
      isFolder: false,
      doc,
      children: [],
    })
  }

  return root
}

function sortChildren(children: TreeNode[]): TreeNode[] {
  return [...children].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })
}

// 获取文档所在文件夹路径
function getDocFolderPaths(filename: string): string[] {
  const parts = filename.split('/')
  if (parts.length <= 1) return []
  return parts.slice(0, -1)
}

// ============ 样式表 ============

const GLOBAL_STYLES = `
/* 文档阅读页三栏独立滚动 */
.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgb(var(--border)); border-radius: 3px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgb(var(--text-muted)); }
.scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgb(var(--border)) transparent; }

/* 文档阅读区通用 prose 样式 */
.doc-read-prose {
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
  font-size: var(--text-base);
  color: rgb(var(--text));
  line-height: 1.75;
}
.doc-read-prose h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgb(var(--border) / 0.4);
  color: rgb(var(--text));
}
.doc-read-prose h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-top: 1.8rem;
  margin-bottom: 0.5rem;
  color: rgb(var(--text));
  scroll-margin-top: 80px;
}
.doc-read-prose h3 {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-top: 1.4rem;
  margin-bottom: 0.4rem;
  color: rgb(var(--text));
  scroll-margin-top: 80px;
}
.doc-read-prose h4 {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.3rem;
  color: rgb(var(--text));
}
.doc-read-prose h5, .doc-read-prose h6 {
  font-size: var(--text-md);
  font-weight: 600;
  margin-top: 0.8rem;
  margin-bottom: 0.3rem;
  color: rgb(var(--text));
}
.doc-read-prose p { margin-bottom: 1rem; }
.doc-read-prose a { color: rgb(var(--primary)); text-decoration: none; transition: color 0.2s; }
.doc-read-prose a:hover { color: rgb(var(--primary-hover)); text-decoration: underline; }
.doc-read-prose strong { font-weight: 600; color: rgb(var(--text)); }
.doc-read-prose em { font-style: italic; }
.doc-read-prose code {
  font-family: "Fira Code", "Source Code Pro", Consolas, monospace;
  font-size: 0.875em;
  background: rgb(var(--code-bg));
  color: rgb(var(--code-text));
  padding: 0.15em 0.4em;
  border-radius: 4px;
  border: 1px solid rgb(var(--border) / 0.3);
}
.doc-read-prose pre {
  background: rgb(var(--code-bg));
  border: 1px solid rgb(var(--border));
  border-radius: 8px;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  margin: 1.2rem 0;
}
.doc-read-prose pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--text-sm);
  color: rgb(var(--code-text));
}
.doc-read-prose blockquote {
  border-left: 4px solid rgb(var(--primary));
  background: rgb(var(--hover));
  padding: 0.75rem 1.25rem;
  margin: 1.2rem 0;
  border-radius: 0 6px 6px 0;
  font-style: italic;
  color: rgb(var(--text-secondary));
}
.doc-read-prose ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.doc-read-prose ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.doc-read-prose li { margin-bottom: 0.3rem; }
.doc-read-prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0;
  font-size: var(--text-table);
}
.doc-read-prose th {
  background: rgb(var(--hover));
  border: 1px solid rgb(var(--border));
  padding: 0.6rem 0.9rem;
  font-weight: 600;
  text-align: left;
}
.doc-read-prose td {
  border: 1px solid rgb(var(--border));
  padding: 0.6rem 0.9rem;
}
.doc-read-prose img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid rgb(var(--border));
  margin: 0.8rem 0;
}
.doc-read-prose hr {
  border: none;
  border-top: 1px solid rgb(var(--border));
  margin: 2rem 0;
}

/* 文档侧边栏列表项 */
.doc-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  color: rgb(var(--text-secondary));
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.875rem;
  line-height: 1.4;
}
.doc-sidebar-item:hover {
  background: rgb(var(--hover));
  color: rgb(var(--text));
}
.doc-sidebar-item.active {
  background: rgb(var(--primary) / 0.12);
  color: rgb(var(--primary));
  font-weight: 600;
}
.doc-sidebar-item.active .doc-sidebar-icon { color: rgb(var(--primary)); }
.doc-sidebar-icon { color: rgb(var(--text-muted)); transition: color 0.2s; flex-shrink: 0; }
`

// ============ 侧边栏树组件 ============

function SidebarTree({
  node,
  currentMeta,
  expandedFolders,
  onToggleFolder,
  closeSidebar,
  depth,
}: {
  node: TreeNode
  currentMeta?: DocMeta
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  closeSidebar: () => void
  depth: number
}) {
  const sorted = sortChildren(node.children)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.03
          }
        }
      }}
    >
      {sorted.map((child) => {
        if (child.isFolder) {
          const expanded = expandedFolders.has(child.path)
          return (
            <motion.div key={child.path} variants={treeItemVariants}>
              <motion.button
                onClick={() => onToggleFolder(child.path)}
                className="doc-sidebar-item w-full text-left"
                style={{ paddingLeft: `${depth * 12 + 12}px` }}
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  animate={{ rotate: expanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-3 h-3 text-[rgb(var(--text-muted))] shrink-0" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {expanded ? (
                    <motion.div
                      key="open"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[rgb(var(--primary))] shrink-0" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Folder className="w-3.5 h-3.5 text-[rgb(var(--text-muted))] shrink-0" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="truncate">{child.name}</span>
              </motion.button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <SidebarTree
                      node={child}
                      currentMeta={currentMeta}
                      expandedFolders={expandedFolders}
                      onToggleFolder={onToggleFolder}
                      closeSidebar={closeSidebar}
                      depth={depth + 1}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        }

        // 文件节点
        const doc = child.doc!
        const isActive = doc.id === currentMeta?.id || doc.docId === currentMeta?.docId
        const DIcon = typeIcons[doc.type] || FileText
        const nameWithoutExt = doc.filename.split('/').pop()?.replace(/\.[^.]+$/, '') || doc.title

        return (
          <motion.div key={doc.id} variants={treeItemVariants}>
            <Link
              href={`/docs/${encodeURIComponent(doc.filename.replace(/\.[^.]+$/, ''))}`}
              className={`doc-sidebar-item ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
              onClick={closeSidebar}
            >
              <span className="w-3 shrink-0" />
              <DIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? '' : 'doc-sidebar-icon'}`} />
              <span className="truncate">{nameWithoutExt}</span>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ============ 组件 ============

interface DocDetailClientProps {
  docId: string
  docList: DocMeta[]
  initialDoc?: DocData | null
}

export default function DocDetailClient({ docId, docList, initialDoc }: DocDetailClientProps) {
  const [doc, setDoc] = useState<DocData | null>(initialDoc || null)
  const [loading, setLoading] = useState(!initialDoc)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollDirRef = useRef<'up' | 'down'>('up')
  const [fabVisible, setFabVisible] = useState(true)

  const tree = useMemo(() => buildTree(docList), [docList])

  // 获取当前文档的 meta
  const currentMeta = useMemo(() => docList.find(d => {
    if (d.id === docId) return true
    if (d.docId === docId) return true
    const nameWithoutExt = d.filename.replace(/\.[^.]+$/, '')
    const decodedId = decodeURIComponent(docId)
    return nameWithoutExt === docId || nameWithoutExt === decodedId
  }), [docList, docId])

  // 初始化：展开当前文档所在的所有父文件夹
  useEffect(() => {
    if (currentMeta) {
      const folderPaths = getDocFolderPaths(currentMeta.filename)
      const pathSet = new Set<string>()
      let accum = ''
      for (const segment of folderPaths) {
        accum = accum ? `${accum}/${segment}` : segment
        pathSet.add(accum)
      }
      setExpandedFolders(pathSet)
    }
  }, [currentMeta])

  // 通过 API 获取文档内容（仅当 SSR 未提供时作为回退）
  useEffect(() => {
    if (initialDoc) return
    fetch(`/api/docs/${encodeURIComponent(docId)}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setDoc(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [docId, initialDoc])

  const closeSidebar = () => setSidebarOpen(false)
  const handleContentClick = () => {
    if (sidebarOpen) closeSidebar()
  }

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderPath)) next.delete(folderPath)
      else next.add(folderPath)
      return next
    })
  }

  // 基于滚动方向自动显示/隐藏移动端 FAB
  useEffect(() => {
    let lastY = 0
    let ticking = false
    const el = contentRef.current
    if (!el) return

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = el.scrollTop
        const dir = y > lastY + 5 ? 'down' : y < lastY - 5 ? 'up' : scrollDirRef.current
        scrollDirRef.current = dir
        setFabVisible(dir === 'up')
        lastY = y
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // 注入全局样式
  useEffect(() => {
    const styleId = 'doc-detail-global-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = GLOBAL_STYLES
      document.head.appendChild(style)
    }
    return () => {
      const existing = document.getElementById(styleId)
      if (existing) existing.remove()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--primary))]" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-[rgb(var(--text-muted))]">
        <p>文档未找到</p>
      </div>
    )
  }

  const sidebarContent = (
    <nav className="p-3 space-y-0.5">
      <SidebarTree
        node={tree}
        currentMeta={currentMeta}
        expandedFolders={expandedFolders}
        onToggleFolder={toggleFolder}
        closeSidebar={closeSidebar}
        depth={0}
      />
    </nav>
  )

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 移动端遮罩 */}
      <AnimatePresence>
        {sidebarOpen && (
          <ModalOverlay className="lg:hidden" onClick={closeSidebar} zIndex={40} />
        )}
      </AnimatePresence>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            className="
              fixed top-0 left-0 z-50 w-72 h-full overflow-y-auto
              bg-[rgb(var(--bg))] border-r border-[rgb(var(--border))]
              lg:hidden
            "
            variants={mobileSidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="sticky top-0 z-10 bg-[rgb(var(--bg))] border-b border-[rgb(var(--border))] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-[rgb(var(--text))]">
                <BookOpen className="w-4 h-4 text-[rgb(var(--primary))]" />
                文档中心
              </div>
              <motion.button
                onClick={closeSidebar}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--hover))] text-[rgb(var(--text-muted))]"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 移动端打开侧边栏按钮 - 滚动时自动隐藏 */}
      <AnimatePresence>
        {fabVisible && (
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="fixed bottom-6 left-6 lg:hidden rounded-full flex items-center justify-center shadow-lg"
            variants={fabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              zIndex: 9999,
              background: 'rgb(var(--card))',
              width: '48px',
              height: '48px',
              padding: 0,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="打开文档目录"
          >
            <List className="w-5 h-5 text-[rgb(var(--text))]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 主体内容区 */}
      <main className="flex-1 w-full relative z-30 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(48rem,calc(100%-560px))_minmax(0,280px)] gap-0 h-full">
          {/* 左侧：文档树（桌面端固定侧边栏） */}
          <motion.aside 
            className="hidden lg:flex flex-col h-full overflow-y-auto scrollbar-thin border-r border-[rgb(var(--border))] py-6"
            variants={desktopSidebarVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="px-4">
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  返回文档列表
                </Link>
              </motion.div>
            </div>
            {sidebarContent}
          </motion.aside>

          {/* 右侧：文档阅读区 */}
          <motion.div
            ref={contentRef}
            className="h-full overflow-y-auto scrollbar-thin py-6 px-4 sm:px-8 lg:px-10 xl:px-14"
            onClick={handleContentClick}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            <article className="max-w-3xl mx-auto">
              <motion.header 
                className="mb-1 pb-2 border-b border-[rgb(var(--border))]"
                variants={headerVariants}
              >
                <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text))] mb-3 leading-tight">
                  {doc.meta.filename.replace(/\.[^.]+$/, '')}
                </h1>
              </motion.header>

              {doc.meta.type === 'pdf' ? (
                <motion.iframe
                  src={`/docs/${doc.meta.filename}`}
                  className="w-full border border-[rgb(var(--border))] rounded-lg"
                  style={{ height: 'calc(100dvh - 220px)' }}
                  title={doc.meta.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                />
              ) : doc.html ? (
                <motion.div
                  className="doc-read-prose"
                  dangerouslySetInnerHTML={{ __html: doc.html }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                />
              ) : (
                <div className="text-center py-12 text-[rgb(var(--text-muted))]">
                  <p>暂无内容</p>
                </div>
              )}
            </article>
          </motion.div>
        </div>
      </main>
    </motion.div>
  )
}
