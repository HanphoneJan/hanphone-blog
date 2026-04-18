import { ENDPOINTS } from '@/lib/api'
import { PAGINATION } from '@/lib/constants'
import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'
import BlogListClient from './BlogListClient'

export const dynamic = 'force-dynamic'

interface Blog {
  id: number
  title: string
  description: string
  firstPicture: string
  createTime: string
  views: number
  recommend: boolean
  type: {
    id: number
    name: string
  }
  user: {
    avatar: string
    nickname: string
  }
}

interface Type {
  id: number
  name: string
}

interface Tag {
  id: number
  name: string
  blogCount?: number
}

interface PageInfo {
  current: number
  size: number
  total: number
  totalPages: number
}

// 获取博客列表（服务端）
async function fetchBlogs(): Promise<{ blogs: Blog[]; pageInfo: PageInfo }> {
  try {
    const res = await fetch(
      `${ENDPOINTS.BLOGS}?pagenum=1&pagesize=${PAGINATION.BLOG_PAGE_SIZE}`,
      { cache: 'no-store' }
    )
    const data = await res.json()

    if (data.code === 200 && data.data) {
      return {
        blogs: data.data.content || [],
        pageInfo: {
          current: data.data.number + 1,
          size: data.data.size,
          total: data.data.totalElements,
          totalPages: data.data.totalPages
        }
      }
    }
    return { blogs: [], pageInfo: { current: 1, size: PAGINATION.BLOG_PAGE_SIZE, total: 0, totalPages: 0 } }
  } catch (error) {
    console.error('Failed to fetch blogs:', error)
    return { blogs: [], pageInfo: { current: 1, size: PAGINATION.BLOG_PAGE_SIZE, total: 0, totalPages: 0 } }
  }
}

// 获取分类列表（服务端）
async function fetchTypes(): Promise<Type[]> {
  try {
    const res = await fetch(ENDPOINTS.TYPE_LIST, { cache: 'no-store' })
    const data = await res.json()
    return data.code === 200 ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch types:', error)
    return []
  }
}

// 获取标签列表（服务端）
async function fetchTags(): Promise<Tag[]> {
  try {
    // 尝试获取带文章数量的标签列表
    const res = await fetch(ENDPOINTS.FULL_TAG_LIST, { cache: 'no-store' })
    const data = await res.json()
    if (data.code === 200 && data.data) {
      return data.data.map((tag: { id: number; name: string; blogNumber?: number }) => ({
        id: tag.id,
        name: tag.name,
        blogCount: tag.blogNumber || 0
      }))
    }
    return []
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return []
  }
}

// 服务端组件
export default async function BlogListPage() {
  const [{ blogs, pageInfo }, types, tags] = await Promise.all([
    fetchBlogs(),
    fetchTypes(),
    fetchTags()
  ])

  // 结构化数据 - CollectionPage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "博客文章",
    "description": "浏览寒枫的个人博客文章，涵盖技术、生活、思考等多个领域的原创内容。",
    "url": `${SITE_URL}/blog`,
    "isPartOf": {
      "@type": "WebSite",
      "name": SITE_CONFIG.name,
      "url": SITE_URL
    },
    "numberOfItems": pageInfo.total,
    "itemListElement": blogs.slice(0, 10).map((blog, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${SITE_URL}/blog/${blog.id}`,
      "name": blog.title
    }))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogListClient
        initialBlogs={blogs}
        initialTypes={types}
        initialPageInfo={pageInfo}
        initialTags={tags}
      />
    </>
  )
}
