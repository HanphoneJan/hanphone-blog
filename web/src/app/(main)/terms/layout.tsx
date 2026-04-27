import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '用户协议',
  '使用本网站前请仔细阅读用户协议，了解使用规则和注意事项。',
  { path: '/terms', keywords: ['用户协议', '服务条款', '使用规则', '注意事项'] }
)

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
