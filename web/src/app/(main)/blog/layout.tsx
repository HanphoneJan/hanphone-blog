import { Metadata } from 'next'
import './blog.css'
import { SITE_URL } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: '博客列表',
  description: '浏览所有博客文章，按分类筛选，发现感兴趣的技术内容和学习心得。',
  keywords: '博客列表,技术文章,文章分类,文章归档,Hanphone',
  authors: [{ name: 'Hanphone' }],
  openGraph: {
    title: '博客列表',
    description: '浏览所有博客文章，按分类筛选，发现感兴趣的技术内容和学习心得。',
    type: 'website',
    url: `${SITE_URL}/blog`,
    siteName: '云林有风',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '博客列表',
    description: '浏览所有博客文章，按分类筛选，发现感兴趣的技术内容和学习心得。',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
