import { cache } from 'react'
import { marked } from 'marked'

// 动态导入可能有问题的库，避免 SSR 问题
const loadMammoth = async () => {
  const mod = await import('mammoth')
  return mod.default || mod
}

const loadDOMPurify = async () => {
  const mod = await import('isomorphic-dompurify')
  return mod.default || mod
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'
const FILE_BASE_URL = process.env.NEXT_PUBLIC_PICTURE_BASE_URL || 'https://hanphone.top'

const SUPPORTED_EXTENSIONS = new Set(['.docx', '.pdf', '.md', '.html'])

export interface DocMeta {
  id: string
  docId?: string      // 后端文档ID
  title: string
  description: string
  filename: string    // 相对路径，如 "subdir/file.md"
  type: string        // 完整后缀名，如 ".docx", ".md", ".html", ".pdf"
  recommend?: boolean
  viewCount?: number
  createTime: string
  docNamespace?: string // 文件服务命名空间，如 "blog/docs"
}

export interface DocData {
  meta: DocMeta
  content: string
  html?: string
}

interface BackendDoc {
  id: number
  docId: string
  title: string
  description: string
  filename: string
  fileType: string
  docNamespace: string
  recommend: boolean
  viewCount: number
  createTime: string
}

// ============ Markdown Frontmatter 解析 ============

interface Frontmatter {
  title?: string
  description?: string
  [key: string]: unknown
}

function parseFrontmatter(content: string): { data: Frontmatter; content: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content }

  try {
    const data = parseSimpleYaml(match[1])
    return { data, content: match[2] }
  } catch {
    return { data: {}, content }
  }
}

function parseSimpleYaml(yaml: string): Frontmatter {
  const result: Frontmatter = {}
  for (const line of yaml.split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      result[kvMatch[1]] = kvMatch[2].trim().replace(/^['"]|['"]$/g, '')
    }
  }
  return result
}

// ============ 标题提取 ============

function extractMarkdownTitle(content: string, name: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  const firstLine = content.split('\n').find(line => line.trim())
  if (firstLine) return firstLine.trim().slice(0, 80)
  return name
}

function extractHtmlTitle(content: string, name: string): string {
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  const h1Match = content.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  return name
}

function extractDocxTitle(html: string, name: string): string {
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  const h2Match = html.match(/<h2[^>]*>([^<]*)<\/h2>/i)
  if (h2Match) return h2Match[1].trim()
  const pMatch = html.match(/<p[^>]*>([^<]*)<\/p>/i)
  if (pMatch) return pMatch[1].trim().slice(0, 80)
  return name
}

// ============ ID 生成 ============

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).substring(0, 8)
}

function generateId(filename: string): string {
  const hasChinese = /[\u4e00-\u9fa5]/.test(filename)
  if (hasChinese) return `doc-${simpleHash(filename)}`

  const safeId = filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return safeId || `doc-${Date.now()}`
}

function getFileType(ext: string): DocMeta['type'] {
  switch (ext) {
    case '.docx': return 'docx'
    case '.pdf': return 'pdf'
    case '.md': return 'md'
    case '.html': return 'html'
    default: return ext.slice(1) as DocMeta['type']
  }
}

// ============ 后端 API 获取 ============

function mapBackendDoc(d: BackendDoc): DocMeta {
  const folderPath = d.docNamespace?.replace('blog/docs/', '').replace('blog/docs', '') || ''
  const fullFilename = folderPath ? `${folderPath}/${d.filename}` : d.filename
  return {
    id: d.docId || String(d.id),
    docId: d.docId,
    title: d.title,
    description: d.description || '',
    filename: fullFilename,
    type: d.fileType || '',
    recommend: d.recommend,
    viewCount: d.viewCount,
    createTime: d.createTime ? d.createTime.split('T')[0] : '',
    docNamespace: d.docNamespace,
  }
}

async function fetchDocsFromBackend(): Promise<DocMeta[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const result = await res.json()
    if (result.flag && Array.isArray(result.data?.content || result.data)) {
      const docs = result.data?.content || result.data
      return (docs as BackendDoc[]).map(mapBackendDoc)
    }
    return []
  } catch {
    return []
  }
}

async function fetchDocFromBackend(docId: string): Promise<BackendDoc | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs/${encodeURIComponent(docId)}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const result = await res.json()
    if (result.flag && result.data) {
      return result.data as BackendDoc
    }
    return null
  } catch {
    return null
  }
}

// ============ 文件服务 URL 构建 ============

export function buildDocFileUrl(docNamespace: string | undefined, filename: string): string {
  const ns = docNamespace || 'blog/docs'
  // filename 可能包含子目录路径，取最后一节作为实际文件名
  const actualFilename = filename.split('/').pop() || filename
  return `${FILE_BASE_URL}/${ns}/${actualFilename}`
}

// ============ 核心函数 ============

export async function getDocMeta(): Promise<{ title: string; description: string; docs: DocMeta[] }> {
  const docs = await fetchDocsFromBackend()
  return {
    title: '文档中心',
    description: '技术文档、教程和参考资料',
    docs,
  }
}

export async function getDocById(id: string): Promise<DocData | null> {
  // 优先从后端获取单个文档详情
  const backendDoc = await fetchDocFromBackend(id)

  let finalMeta: DocMeta | undefined
  if (backendDoc) {
    finalMeta = mapBackendDoc(backendDoc)
  } else {
    // 回退：从列表中匹配
    const meta = await getDocMeta()
    finalMeta = meta.docs.find(d => {
      if (d.id === id || d.docId === id) return true
      const nameWithoutExt = d.filename.replace(/\.[^.]+$/, '')
      const decodedId = decodeURIComponent(id)
      return nameWithoutExt === id || nameWithoutExt === decodedId
    })
  }

  if (!finalMeta) return null

  // 从文件服务下载文件内容
  const ns = backendDoc?.docNamespace || finalMeta.docNamespace || 'blog/docs'
  const actualFilename = backendDoc?.filename || finalMeta.filename.split('/').pop() || finalMeta.filename
  const fileUrl = buildDocFileUrl(ns, actualFilename)

  try {
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) {
      // 文件服务不可用，对于 PDF 仍可返回 meta（前端用 iframe 直接访问文件服务）
      const type = finalMeta.type.startsWith('.') ? finalMeta.type.slice(1) : finalMeta.type
      if (type === 'pdf') {
        return { meta: finalMeta, content: '', html: '' }
      }
      return null
    }

    const type = finalMeta.type.startsWith('.') ? finalMeta.type.slice(1) : finalMeta.type

    switch (type) {
      case 'docx':
        return await loadDocx(finalMeta, await fileRes.arrayBuffer())
      case 'md':
        return await loadMarkdown(finalMeta, await fileRes.text())
      case 'html':
        return await loadHtml(finalMeta, await fileRes.text())
      case 'pdf':
        return { meta: finalMeta, content: '', html: '' }
      default:
        return null
    }
  } catch {
    // 网络异常时，PDF 仍可返回 meta
    const type = finalMeta.type.startsWith('.') ? finalMeta.type.slice(1) : finalMeta.type
    if (type === 'pdf') {
      return { meta: finalMeta, content: '', html: '' }
    }
    return null
  }
}

async function loadDocx(meta: DocMeta, buffer: ArrayBuffer): Promise<DocData> {
  const mammoth = await loadMammoth()
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) })
  return { meta, content: result.value, html: result.value }
}

async function loadMarkdown(meta: DocMeta, raw: string): Promise<DocData> {
  const { content } = parseFrontmatter(raw)
  const html = await marked.parse(content, { async: true })
  return { meta, content, html }
}

async function loadHtml(meta: DocMeta, content: string): Promise<DocData> {
  // 服务端跳过 DOMPurify 清洗：isomorphic-dompurify 在 SSR 时依赖 jsdom，
  // 该库体量大、初始化慢，容易导致 SSR 超时/崩溃，进而触发 SW 的 no-response 错误。
  // 客户端由 DocDetailClient 在 dangerouslySetInnerHTML 前使用浏览器原生 DOMPurify 清洗。
  if (typeof window === 'undefined') {
    return { meta, content, html: content }
  }
  const DOMPurify = await loadDOMPurify()
  const cleanHtml = (DOMPurify as any).sanitize(content, { USE_PROFILES: { html: true } })
  return { meta, content, html: cleanHtml }
}

// React cache：同一请求内去重，避免多次调用 API
export const cachedGetDocMeta = cache(getDocMeta)
export const cachedGetDocById = cache(getDocById)
