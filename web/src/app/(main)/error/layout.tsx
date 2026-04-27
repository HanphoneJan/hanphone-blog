import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '访问错误',
  '页面访问出现错误，请检查链接或返回首页。',
  { path: '/error', keywords: ['错误页面', '404', '访问错误'], noIndex: true }
)

export default function ErrorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
