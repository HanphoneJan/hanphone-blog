import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '留言板',
  '欢迎留言交流，分享你的想法和建议。',
  { path: '/messages', keywords: ['留言板', '留言', '交流', '想法分享'] }
)

export default function MessageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
