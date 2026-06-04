import { ENDPOINTS } from '@/lib/api'
import {  PAGINATION , API_CODE } from '@/lib/constants'
import { createMetadata } from '@/lib/seo-config'
import HomeClient from './HomeClient'
import type { Blog, Type, Tag } from './types'

// 本地接口定义（遵循其他页面规范）
interface Essay {
  id: number
  content: string
  createTime: string
  nickname: string
  avatar: string
  likes: number
}

interface Project {
  id: number
  title: string
  content: string
  pic_url: string
  url: string
  techs: string
  type: number
  recommend: boolean
  published: boolean
}

interface SiteStats {
  blogCount: number
  essayCount: number
  projectCount: number
  messageCount: number
  docCount: number
}

// ISR：每5分钟重新验证
export const revalidate = 300

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
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()

    if (data.code === API_CODE.SUCCESS && data.data) {
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
    const res = await fetch(ENDPOINTS.TYPE_LIST, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.code === API_CODE.SUCCESS ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch types:', error)
    return []
  }
}

// 获取标签列表（服务端）
async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await fetch(ENDPOINTS.TAG_LIST, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.code === API_CODE.SUCCESS ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return []
  }
}

// 获取推荐博客列表（服务端）
async function fetchRecommendBlogs(): Promise<Blog[]> {
  try {
    const res = await fetch(ENDPOINTS.RECOMMEND_BLOG_LIST, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.code === API_CODE.SUCCESS ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch recommend blogs:', error)
    return []
  }
}

// 获取推荐随笔列表（服务端）
async function fetchRecommendEssays(): Promise<Essay[]> {
  try {
    const res = await fetch(ENDPOINTS.RECOMMEND_ESSAY_LIST, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.code === API_CODE.SUCCESS ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch recommend essays:', error)
    return []
  }
}

// 获取推荐项目列表（服务端）
async function fetchRecommendProjects(): Promise<Project[]> {
  try {
    const res = await fetch(ENDPOINTS.RECOMMEND_PROJECT_LIST, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data.code === API_CODE.SUCCESS ? data.data || [] : []
  } catch (error) {
    console.error('Failed to fetch recommend projects:', error)
    return []
  }
}

// 获取站点统计（服务端）
async function fetchSiteStats(): Promise<SiteStats> {
  try {
    const res = await fetch(ENDPOINTS.SITE_STATS, { next: { revalidate: 300 } })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && data.data) {
      return {
        blogCount: data.data.blogCount || 0,
        essayCount: data.data.essayCount || 0,
        projectCount: data.data.projectCount || 0,
        messageCount: data.data.messageCount || 0,
        docCount: data.data.docCount || 0
      }
    }
    return { blogCount: 0, essayCount: 0, projectCount: 0, messageCount: 0, docCount: 0 }
  } catch (error) {
    console.error('Failed to fetch site stats:', error)
    return { blogCount: 0, essayCount: 0, projectCount: 0, messageCount: 0, docCount: 0 }
  }
}

// 服务端组件
export default async function HomePage() {
  const [blogsData, types, tags, recommendList, recommendEssays, recommendProjects, siteStats] = await Promise.all([
    fetchBlogs(),
    fetchTypes(),
    fetchTags(),
    fetchRecommendBlogs(),
    fetchRecommendEssays(),
    fetchRecommendProjects(),
    fetchSiteStats()
  ])

  return (
    <HomeClient
      initialBlogs={blogsData.blogs}
      initialTypes={types}
      initialTags={tags}
      initialRecommendList={recommendList}
      initialTotal={blogsData.total}
      initialEssays={recommendEssays}
      initialProjects={recommendProjects}
      initialSiteStats={siteStats}
    />
  )
}
