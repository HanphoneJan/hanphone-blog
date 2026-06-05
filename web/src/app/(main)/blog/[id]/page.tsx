import { notFound } from 'next/navigation'
import { ENDPOINTS } from '@/lib/api'
import { createMetadata } from '@/lib/seo-config'
import BlogDetailClient from './components/BlogDetailClient'
import type { Blog, RelatedBlog, RecommendedBlog } from './types'

import { API_CODE } from '@/lib/constants'

interface BlogDetailPageProps {
  params: Promise<{ id: string }>
}

// 静态导出：构建时预生成所有博客详情页面
export async function generateStaticParams() {
  try {
    const res = await fetch(`${ENDPOINTS.BLOGS}?pagenum=1&pagesize=100`)
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && data.data) {
      return (data.data.content || []).map((blog: { id: number }) => ({ id: String(blog.id) }))
    }
  } catch {
    // 构建时后端不可用则返回空数组
  }
  return []
}

// 获取博客详情（服务端）
async function fetchBlogData(id: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${ENDPOINTS.BLOG}/${id}`)
    const data = await res.json()

    if (data.code === API_CODE.SUCCESS && data.data) {
      return {
        ...data.data,
        likes: data.data.likes ?? 0,
        isLiked: data.data.liked ?? false
      }
    }
    return null
  } catch (error) {
    console.error('Failed to fetch blog:', error)
    return null
  }
}

// 获取相关博客（服务端）
async function fetchRelatedBlogs(typeId: number, currentBlogId: number): Promise<RelatedBlog[]> {
  if (!typeId) return []

  try {
    const res = await fetch(`${ENDPOINTS.TYPE_BLOGS(typeId)}?pagenum=1&pagesize=10`)
    const data = await res.json()

    const content = data.data?.content ?? data.content ?? []
    return (Array.isArray(content) ? content : [])
      .filter((b: Blog) => b.id !== currentBlogId)
      .slice(0, 6)
      .map((b: Blog) => ({ id: b.id, title: b.title }))
  } catch (error) {
    console.error('Failed to fetch related blogs:', error)
    return []
  }
}

// 获取推荐博客（基于标签相关，不足用随机博客补充，最多3篇）
async function fetchRecommendedBlogs(blog: Blog): Promise<RecommendedBlog[]> {
  const currentId = blog.id
  const tags = blog.tags || []
  const seen = new Map<number, RecommendedBlog>()

  // 基于标签获取相关博客（取前3个标签，避免过多请求）
  if (tags.length > 0) {
    const tagPromises = tags.slice(0, 3).map(async (tag) => {
      try {
        const res = await fetch(`${ENDPOINTS.TAG_BLOGS(tag.id)}?pagenum=1&pagesize=10`)
        const data = await res.json()
        const content = data.data?.content ?? data.content ?? []
        return Array.isArray(content) ? content : []
      } catch {
        return []
      }
    })

    const tagResults = await Promise.all(tagPromises)
    for (const list of tagResults) {
      for (const b of list) {
        if (b.id !== currentId && !seen.has(b.id)) {
          seen.set(b.id, {
            id: b.id,
            title: b.title,
            firstPicture: b.firstPicture || '',
            createTime: b.createTime || '',
            views: b.views ?? 0,
            description: b.description || '',
            user: {
              avatar: b.user?.avatar || '',
              nickname: b.user?.nickname || ''
            }
          })
        }
      }
    }
  }

  // 如果标签相关不足3篇，从随机博客补充
  const tagCount = seen.size
  if (tagCount < 3) {
    try {
      const need = 3 - tagCount
      const res = await fetch(`${ENDPOINTS.RANDOM_BLOGS}?excludeId=${currentId}&size=${need}`)
      const data = await res.json()
      const list = data.data ?? []
      if (Array.isArray(list)) {
        for (const b of list) {
          if (b.id !== currentId && !seen.has(b.id)) {
            seen.set(b.id, {
              id: b.id,
              title: b.title,
              firstPicture: b.firstPicture || '',
              createTime: b.createTime || '',
              views: b.views ?? 0,
              description: b.description || '',
              user: {
                avatar: b.user?.avatar || '',
                nickname: b.user?.nickname || ''
              }
            })
          }
        }
      }
    } catch {
      // 忽略随机博客获取失败
    }
  }

  return Array.from(seen.values()).slice(0, 3)
}

// 生成元数据
export async function generateMetadata({ params }: BlogDetailPageProps) {
  const { id } = await params
  const blog = await fetchBlogData(id)

  if (!blog) {
    return createMetadata(
      '文章未找到',
      '抱歉，您访问的文章不存在或已被删除。',
      { noIndex: true }
    )
  }

  const keywords = blog.tags?.map(tag => tag.name) || []

  return createMetadata(
    blog.title,
    blog.description || blog.content.slice(0, 150),
    {
      path: `/blog/${id}`,
      keywords,
      type: 'article',
      publishedTime: blog.createTime,
      authors: [blog.user?.nickname || '寒枫'],
      ogImage: blog.firstPicture || undefined
    }
  )
}

// 服务端组件
export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { id } = await params
  const blog = await fetchBlogData(id)

  if (!blog) {
    notFound()
  }

  // 并行获取同分类相关博客和标签推荐博客
  const [relatedBlogs, recommendedBlogs] = await Promise.all([
    blog.type?.id ? fetchRelatedBlogs(blog.type.id, blog.id) : Promise.resolve([]),
    fetchRecommendedBlogs(blog)
  ])

  return (
    <BlogDetailClient
      initialBlog={blog}
      initialRelatedBlogs={relatedBlogs}
      initialRecommendedBlogs={recommendedBlogs}
      blogId={id}
    />
  )
}


