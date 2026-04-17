import { ENDPOINTS } from '@/lib/api'
import { PAGINATION } from '@/lib/constants'
import HomeClient from './HomeClient'
import type { Blog, Type, Tag } from './types'

export const dynamic = 'force-dynamic'

// 获取博客列表（服务端）
async function fetchBlogs(): Promise<{ blogs: Blog[]; total: number }> {
  try {
    const res = await fetch(
      `${ENDPOINTS.BLOGS}?pagenum=1&pagesize=${PAGINATION.BLOG_PAGE_SIZE}`,
      { cache: 'no-store' }
    )
    const data = await res.json()

    if (data.code === 200 && data.data) {
      // 对博客列表进行排序，推荐博客优先
      const sortedBlogs = (data.data.content || []).sort((a: Blog, b: Blog) => {
        if (b.recommend && !a.recommend) return 1
        if (a.recommend && !b.recommend) return -1
        return 0
      })
      return {
        blogs: sortedBlogs,
        total: data.data.totalElements || 0
      }
    }
    return { blogs: [], total: 0 }
  } catch (error) {
    console.error('Failed to fetch blogs:', error)
    return { blogs: [], total: 0 }
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
    const res = await fetch(ENDPOINTS.TAG_LIST, { cache: 'no-store' })
    const data = await res.json()
    return data.code === 200 ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return []
  }
}

// 获取推荐博客列表（服务端）
async function fetchRecommendBlogs(): Promise<Blog[]> {
  try {
    const res = await fetch(ENDPOINTS.RECOMMEND_BLOG_LIST, { cache: 'no-store' })
    const data = await res.json()
    return data.code === 200 ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch recommend blogs:', error)
    return []
  }
}

// 生成元数据
export async function generateMetadata() {
  return {
    title: '寒枫的个人博客 | 分享技术与生活',
    description: '寒枫的个人博客，分享前端、后端、全栈开发技术，以及生活感悟和思考。',
    keywords: '寒枫,博客,技术博客,前端开发,后端开发,全栈开发,React,Node.js'
  }
}

// 服务端组件
export default async function HomePage() {
  const [blogsData, types, tags, recommendList] = await Promise.all([
    fetchBlogs(),
    fetchTypes(),
    fetchTags(),
    fetchRecommendBlogs()
  ])

  return (
    <HomeClient
      initialBlogs={blogsData.blogs}
      initialTypes={types}
      initialTags={tags}
      initialRecommendList={recommendList}
      initialTotal={blogsData.total}
    />
  )
}
