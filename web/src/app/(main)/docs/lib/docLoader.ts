import { readFile, readdir, stat } from 'fs/promises'
import { join, extname, basename, relative } from 'path'
import { cache } from 'react'

// 动态导入可能有问题的库，避免 SSR 问题
const loadMammoth = async () => {
  const mod = await import('mammoth')
  return mod.default || mod
}

const loadDOMPurify = async () => {
  const mod = await import('isomorphic-dompurify')
  return mod.default || mod
}

const loadUnified = async () => {
  const [{ unified }, { default: remarkParse }, { default: remarkRehype }, { default: rehypeStringify }, { default: rehypeSanitize }] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-rehype'),
    import('rehype-stringify'),
    import('rehype-sanitize'),
  ])
  return { unified, remarkParse, remarkRehype, rehypeStringify, rehypeSanitize }
}

const DOCS_DIR = join(process.cwd(), 'public', 'docs')
const META_FILE = join(process.cwd(), 'public', 'docs-meta.json')

const SUPPORTED_EXTENSIONS = new Set(['.docx', '.pdf', '.md', '.html'])

export interface DocMeta {
  id: string
  title: string
  description: string
  filename: string    // 相对路径，如 "subdir/file.md"
  type: 'docx' | 'pdf' | 'md' | 'html'
  createTime: string
}

export interface DocData {
  meta: DocMeta
  content: string
  html?: string
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
  // filename 是相对路径，如 "subdir/my-doc"
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

// ============ 递归扫描目录 ============

async function scanDirRecursive(dir: string, baseDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await scanDirRecursive(fullPath, baseDir)
      results.push(...subFiles)
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        // 返回相对于 baseDir 的路径
        results.push(relative(baseDir, fullPath).replace(/\\/g, '/'))
      }
    }
  }

  return results
}

// ============ 核心函数 ============

async function loadExistingMeta(): Promise<Map<string, DocMeta>> {
  try {
    const content = await readFile(META_FILE, 'utf-8')
    const data = JSON.parse(content)
    const map = new Map<string, DocMeta>()
    for (const doc of data.docs || []) {
      map.set(doc.filename, doc)
    }
    return map
  } catch {
    return new Map()
  }
}

async function loadSidecarMeta(filepath: string): Promise<Partial<DocMeta> | null> {
  try {
    const metaPath = filepath + '.meta.json'
    const content = await readFile(metaPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function getDocMeta(): Promise<{ title: string; description: string; docs: DocMeta[] }> {
  const existingMeta = await loadExistingMeta()

  try {
    const relativePaths = await scanDirRecursive(DOCS_DIR, DOCS_DIR)
    const docs: DocMeta[] = []

    for (const relPath of relativePaths) {
      const filepath = join(DOCS_DIR, relPath)
      const ext = extname(relPath).toLowerCase()
      const nameWithoutExt = basename(relPath, ext)

      const existing = existingMeta.get(relPath)
      const sidecar = await loadSidecarMeta(filepath)

      // 优先级：旁元数据 > 已有元数据 > 自动提取
      let title = sidecar?.title || existing?.title
      let description = sidecar?.description || existing?.description
      const createTime = sidecar?.createTime || existing?.createTime

      // 自动提取标题
      if (!title) {
        try {
          if (ext === '.md') {
            const raw = await readFile(filepath, 'utf-8')
            const { data, content } = parseFrontmatter(raw)
            title = data.title || extractMarkdownTitle(content, nameWithoutExt)
            if (!description) description = data.description || `文档: ${title}`
          } else if (ext === '.html') {
            const raw = await readFile(filepath, 'utf-8')
            title = extractHtmlTitle(raw, nameWithoutExt)
            if (!description) description = `文档: ${title}`
          } else if (ext === '.docx') {
            const mammoth = await loadMammoth()
            const buffer = await readFile(filepath)
            const result = await mammoth.convertToHtml({ buffer })
            title = extractDocxTitle(result.value, nameWithoutExt)
            if (!description) description = `文档: ${title}`
          }
        } catch {
          title = nameWithoutExt
        }
      }

      if (!title) title = nameWithoutExt
      if (!description) description = `文档: ${title}`

      const docId = existing?.id || generateId(nameWithoutExt)

      const stats = await stat(filepath)
      const mtime = createTime || stats.mtime.toISOString().split('T')[0]

      docs.push({
        id: docId,
        title,
        description,
        filename: relPath,
        type: getFileType(ext),
        createTime: mtime,
      })
    }

    docs.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())

    return {
      title: '文档中心',
      description: '技术文档、教程和参考资料',
      docs,
    }
  } catch (error) {
    try {
      const content = await readFile(META_FILE, 'utf-8')
      return JSON.parse(content)
    } catch {
      return { title: '文档中心', description: '技术文档、教程和参考资料', docs: [] }
    }
  }
}

export async function getDocById(id: string): Promise<DocData | null> {
  const meta = await getDocMeta()
  const docMeta = meta.docs.find(d => {
    if (d.id === id) return true
    // 支持用相对路径（不含扩展名）匹配
    const nameWithoutExt = d.filename.replace(/\.[^.]+$/, '')
    const decodedId = decodeURIComponent(id)
    return nameWithoutExt === id || nameWithoutExt === decodedId
  })

  if (!docMeta) return null

  const filepath = join(DOCS_DIR, docMeta.filename)

  switch (docMeta.type) {
    case 'docx':
      return await loadDocx(docMeta, filepath)
    case 'md':
      return await loadMarkdown(docMeta, filepath)
    case 'html':
      return await loadHtml(docMeta, filepath)
    case 'pdf':
      return await loadPdf(docMeta, filepath)
    default:
      return null
  }
}

async function loadDocx(meta: DocMeta, filepath: string): Promise<DocData> {
  const buffer = await readFile(filepath)
  const mammoth = await loadMammoth()
  const result = await mammoth.convertToHtml({ buffer })
  return { meta, content: result.value, html: result.value }
}

async function loadMarkdown(meta: DocMeta, filepath: string): Promise<DocData> {
  const raw = await readFile(filepath, 'utf-8')
  const { content } = parseFrontmatter(raw)

  const { unified, remarkParse, remarkRehype, rehypeSanitize, rehypeStringify } = await loadUnified()
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content)

  return { meta, content, html: String(result) }
}

async function loadHtml(meta: DocMeta, filepath: string): Promise<DocData> {
  const content = await readFile(filepath, 'utf-8')
  const DOMPurify = await loadDOMPurify()
  const cleanHtml = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } })
  return { meta, content, html: cleanHtml }
}

async function loadPdf(meta: DocMeta, _filepath: string): Promise<DocData> {
  return { meta, content: '', html: '' }
}

// React cache：同一请求内去重，避免多次扫描文件系统
export const cachedGetDocMeta = cache(getDocMeta)
export const cachedGetDocById = cache(getDocById)
