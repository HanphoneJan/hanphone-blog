import { ENDPOINTS } from '@/lib/api'
import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'
import { cachedGetDocMeta } from '@/app/(main)/docs/lib/docLoader'
import { cache } from 'react'

// ==================== 类型定义 ====================

interface Blog {
  id: number
  title: string
  description: string
  content: string
  firstPicture: string
  createTime: string
  updateTime: string
  views: number
  recommend: boolean
  type: { id: number; name: string }
  tags?: { id: number; name: string }[]
  user: { avatar: string; nickname: string }
}

interface Essay {
  id: number
  title: string
  content: string
  description?: string
  createTime: string
  updateTime: string
  essayFileUrls?: string[]
}

interface Project {
  id: number
  name: string
  description: string
  url: string
  coverImage?: string
  createTime: string
  updateTime: string
  type: number
}

interface RssItem {
  title: string
  link: string
  guid: string
  pubDate: string
  description: string
  contentEncoded?: string
  category: string
  author: string
  enclosure?: { url: string; type: string }
}

// ==================== 数据获取函数 ====================

// 获取所有博客列表
async function fetchAllBlogs(): Promise<Blog[]> {
  try {
    const res = await fetch(
      `${ENDPOINTS.BLOGS}?pagenum=1&pagesize=1000`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.code === 200 && data.data) {
      return data.data.content || []
    }
    return []
  } catch (error) {
    console.error('Failed to fetch blogs for RSS:', error)
    return []
  }
}

// 获取所有随笔列表
async function fetchAllEssays(): Promise<Essay[]> {
  try {
    const res = await fetch(
      `${ENDPOINTS.ESSAYS}?pagenum=1&pagesize=1000`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.code === 200 && data.data) {
      return data.data.content || []
    }
    return []
  } catch (error) {
    console.error('Failed to fetch essays for RSS:', error)
    return []
  }
}

// 获取所有项目列表
async function fetchAllProjects(): Promise<Project[]> {
  try {
    const res = await fetch(
      `${ENDPOINTS.PROJECTS}?pagenum=1&pagesize=1000`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.code === 200 && data.data) {
      return data.data.content || []
    }
    return []
  } catch (error) {
    console.error('Failed to fetch projects for RSS:', error)
    return []
  }
}

// ==================== 工具函数 ====================

// 转义XML特殊字符
function escapeXml(unsafe: string): string {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 生成RSS item XML
function generateRssItem(item: RssItem): string {
  const enclosureXml = item.enclosure
    ? `<enclosure url="${item.enclosure.url}" type="${item.enclosure.type}" />`
    : ''

  const contentEncodedXml = item.contentEncoded
    ? `<content:encoded><![CDATA[${item.contentEncoded}]]></content:encoded>`
    : ''

  return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>
      ${contentEncodedXml}
      <category>${escapeXml(item.category)}</category>
      ${enclosureXml}
      <author>${escapeXml(item.author)}</author>
    </item>`
}

// ==================== 内容转换函数 ====================

// 博客转RSS item
function blogToRssItem(blog: Blog): RssItem {
  const content = blog.content || ''
  const description = blog.description || content.slice(0, 200).replace(/<[^>]*>/g, '')
  
  return {
    title: blog.title,
    link: `${SITE_URL}/blog/${blog.id}`,
    guid: `${SITE_URL}/blog/${blog.id}`,
    pubDate: new Date(blog.createTime).toUTCString(),
    description: description,
    contentEncoded: content || undefined,
    category: blog.type?.name || '博客',
    author: blog.user?.nickname || SITE_CONFIG.author.name,
    enclosure: blog.firstPicture
      ? { url: blog.firstPicture, type: 'image/jpeg' }
      : undefined,
  }
}

// 随笔转RSS item
function essayToRssItem(essay: Essay): RssItem {
  const content = essay.content || ''
  const description = essay.description || content.slice(0, 200).replace(/<[^>]*>/g, '') || '随笔内容'
  
  return {
    title: essay.title,
    link: `${SITE_URL}/essay/${essay.id}`,
    guid: `${SITE_URL}/essay/${essay.id}`,
    pubDate: new Date(essay.createTime).toUTCString(),
    description: description,
    contentEncoded: content || undefined,
    category: '随笔',
    author: SITE_CONFIG.author.name,
  }
}

// 项目转RSS item
function projectToRssItem(project: Project): RssItem {
  const typeMap: Record<number, string> = {
    0: '个人项目',
    1: '团队项目',
    2: '开源项目',
  }
  
  return {
    title: project.name,
    link: project.url || `${SITE_URL}/project`,
    guid: `${SITE_URL}/project#${project.id}`,
    pubDate: new Date(project.createTime || Date.now()).toUTCString(),
    description: project.description || '项目展示',
    category: typeMap[project.type] || '项目',
    author: SITE_CONFIG.author.name,
    enclosure: project.coverImage
      ? { url: project.coverImage, type: 'image/jpeg' }
      : undefined,
  }
}

// 文档转RSS item
function docToRssItem(doc: { id: string; title: string; description: string; filename: string; createTime: string }): RssItem {
  const filenameWithoutExt = doc.filename.replace(/\.[^.]+$/, '')
  
  return {
    title: doc.title,
    link: `${SITE_URL}/docs/${encodeURIComponent(filenameWithoutExt)}`,
    guid: `${SITE_URL}/docs/${encodeURIComponent(filenameWithoutExt)}`,
    pubDate: new Date(doc.createTime).toUTCString(),
    description: doc.description || `文档: ${doc.title}`,
    category: '文档',
    author: SITE_CONFIG.author.name,
  }
}

// ==================== 主RSS生成函数 ====================

// 使用 React cache 进行请求级缓存
const fetchAllRssData = cache(async () => {
  const [blogs, essays, projects, docMeta] = await Promise.all([
    fetchAllBlogs(),
    fetchAllEssays(),
    fetchAllProjects(),
    cachedGetDocMeta().catch(() => ({ docs: [] })),
  ])

  // 转换所有内容为 RSS items
  const blogItems = blogs.map(blogToRssItem)
  const essayItems = essays.map(essayToRssItem)
  const projectItems = projects.map(projectToRssItem)
  const docItems = docMeta.docs.map(docToRssItem)

  // 合并所有内容并按发布时间排序（最新的在前）
  const allItems = [...blogItems, ...essayItems, ...projectItems, ...docItems]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  // 限制返回最近 100 条，避免 RSS 文件过大
  return allItems.slice(0, 100)
})

// 生成完整的 RSS XML
function generateRssXml(items: RssItem[]): string {
  const now = new Date().toUTCString()
  const itemsXml = items.map(generateRssItem).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml('寒枫的博客')}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <language>${SITE_CONFIG.language}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Next.js RSS Feed Generator</generator>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}${SITE_CONFIG.images.favicon}</url>
      <title>${escapeXml('寒枫的博客')}</title>
      <link>${SITE_URL}</link>
    </image>
    <copyright>Copyright ${new Date().getFullYear()} ${escapeXml(SITE_CONFIG.author.name)}</copyright>
    <webMaster>${SITE_CONFIG.author.email} (${escapeXml(SITE_CONFIG.author.name)})</webMaster>
    <managingEditor>${SITE_CONFIG.author.email} (${escapeXml(SITE_CONFIG.author.name)})</managingEditor>
    <dc:creator>${escapeXml(SITE_CONFIG.author.name)}</dc:creator>
    ${itemsXml}
  </channel>
</rss>`
}

// ==================== API Handler ====================

export async function GET() {
  try {
    const items = await fetchAllRssData()
    const rssXml = generateRssXml(items)

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate RSS:', error)
    
    // 返回一个基本的 RSS 作为 fallback
    const fallbackXml = generateRssXml([])
    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
      status: 200,
    })
  }
}
