import { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: '友链',
  description: '有朋自远方来，不亦乐乎！',
  keywords: '友情链接,友链,资源分享,工具推荐,文章推荐，Hanphone',
  authors: [{ name: 'Hanphone' }],
  openGraph: {
    title: '友链',
    description: '有朋自远方来，不亦乐乎！',
    type: 'website',
    url: `${SITE_URL}/link`,
    siteName: '云林有风',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '友链',
    description: '有朋自远方来，不亦乐乎！',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LinkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
