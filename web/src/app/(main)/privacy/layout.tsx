import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '隐私条款',
  '了解本网站如何收集、使用、披露、保存和保护您的个人信息。',
  { path: '/privacy', keywords: ['隐私条款', '隐私政策', '数据保护', '个人信息'] }
)

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
