import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '友情链接',
  '有朋自远方来，不亦乐乎！交换友情链接，分享优质资源。',
  { path: '/links', keywords: ['友情链接', '友链', '资源分享', '工具推荐', '文章推荐'] }
)

export default function LinkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
