import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo-config'
import { ENDPOINTS } from '@/lib/api'
import { cachedGetDocMeta } from '@/app/(main)/docs/lib/docLoader'

// 静态页面配置
// priority 区分度：首页 1.0 > 核心内容 0.8 > 次要聚合页 0.6 > 低频页面 0.4 > 法律/工具页 0.2-0.3
// changeFrequency 根据实际内容更新频率设置
const STATIC_PAGES: MetadataRoute.Sitemap = [
  // 核心高频页面
  { url: `${SITE_URL}/`, priority: 1, changeFrequency: 'daily' },

  // 次要聚合页
  { url: `${SITE_URL}/blog`, priority: 0.6, changeFrequency: 'daily' },
  { url: `${SITE_URL}/essay`, priority: 0.6, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/project`, priority: 0.6, changeFrequency: 'yearly' },
  { url: `${SITE_URL}/personal`, priority: 0.6, changeFrequency: 'monthly' },

  // 低频/工具页面
  { url: `${SITE_URL}/message`, priority: 0.4, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/link`, priority: 0.3, changeFrequency: 'yearly' },
  { url: `${SITE_URL}/docs`, priority: 0.5, changeFrequency: 'weekly' },

  // 子项目：照片墙（不定期更新照片）
  { url: `${SITE_URL}/atlas`, priority: 0.5, changeFrequency: 'monthly' },

  // 法律/固定页面（低优先级，极少变动）
  { url: `${SITE_URL}/privacy`, priority: 0.2, changeFrequency: 'yearly' },
  { url: `${SITE_URL}/terms`, priority: 0.2, changeFrequency: 'yearly' },
]

// 博客列表 API 响应类型
interface BlogItem {
  id: number
  title: string
  updateTime?: string
  createTime?: string
}

interface BlogListResponse {
  code: number
  data: {
    content: BlogItem[]
    totalElements: number
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 动态获取博客文章列表
  let blogPages: MetadataRoute.Sitemap = []

  try {
    // 获取所有博客（设置较大的 pagesize 以获取全部）
    const res = await fetch(`${ENDPOINTS.BLOGS}?pagenum=1&pagesize=1000`, {
      next: { revalidate: 3600 }, // 缓存 1 小时
    })

    if (res.ok) {
      const data: BlogListResponse = await res.json()
      const blogs = data.data?.content || []

      blogPages = blogs.map((blog) => {
        // 根据是否有 updateTime 判断文章是否可能继续更新
        // 有 updateTime 说明文章曾被编辑过，设为 monthly
        // 无 updateTime 说明文章发布后未修改，设为 yearly
        const hasBeenUpdated = !!blog.updateTime

        return {
          url: `${SITE_URL}/blog/${blog.id}`,
          lastModified: blog.updateTime || blog.createTime,
          changeFrequency: hasBeenUpdated ? ('monthly' as const) : ('yearly' as const),
          priority: 0.8,
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch blog list for sitemap:', error)
  }

  // 动态获取文档列表
  let docPages: MetadataRoute.Sitemap = []

  try {
    const meta = await cachedGetDocMeta()
    docPages = meta.docs.map((doc) => ({
      url: `${SITE_URL}/docs/${encodeURIComponent(doc.filename.replace(/\.[^.]+$/, ''))}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Failed to fetch docs for sitemap:', error)
  }

  return [...STATIC_PAGES, ...blogPages, ...docPages]
}
