import { ENDPOINTS } from '@/lib/api'
import { PAGINATION } from '@/lib/constants'
import { createMetadata } from '@/lib/seo-config'
import HomeClient from './HomeClient'
import type { Blog, Type, Tag } from './types'

export const dynamic = 'force-dynamic'

// 生成元数据
export const metadata = createMetadata(
  '首页',
  '寒枫的个人博客 | Hanphone\'s Blog | 分享Agent开发、前端开发、全栈开发、机器学习等技术文章，记录项目经验、生活经历，探究AI应用，探索自我发展。',
  { path: '/' }
)

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
