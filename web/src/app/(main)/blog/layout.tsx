import { createMetadata } from '@/lib/seo-config'
import './blog.css'

export const metadata = createMetadata(
  '博客',
  '浏览所有博客文章，按分类筛选，发现感兴趣的技术内容和学习心得。',
  { path: '/blog', keywords: ['博客', '技术文章', '文章分类', '文章归档'] }
)

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
