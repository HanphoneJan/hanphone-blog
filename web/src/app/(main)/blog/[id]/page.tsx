import { notFound } from 'next/navigation'
import { ENDPOINTS } from '@/lib/api'
import { createMetadata } from '@/lib/seo-config'
import BlogDetailClient from './components/BlogDetailClient'
import type { Blog, RelatedBlog } from './types'

interface BlogDetailPageProps {
  params: Promise<{ id: string }>
}

// 获取博客详情（服务端）
async function fetchBlogData(id: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${ENDPOINTS.BLOG}/${id}`, {
      cache: 'no-store'
    })
    const data = await res.json()

    if (data.code === 200 && data.data) {
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
    const res = await fetch(`${ENDPOINTS.TYPE_BLOGS(typeId)}?pagenum=1&pagesize=10`, {
      cache: 'no-store'
    })
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

  // 获取相关博客
  const relatedBlogs = blog.type?.id
    ? await fetchRelatedBlogs(blog.type.id, blog.id)
    : []

  return (
    <BlogDetailClient
      initialBlog={blog}
      initialRelatedBlogs={relatedBlogs}
      blogId={id}
    />
  )
}
