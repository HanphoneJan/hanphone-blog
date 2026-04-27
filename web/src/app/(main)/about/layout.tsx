import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '关于我',
  '了解更多寒枫的信息，包括技能、作品、爱好和评价。',
  { path: '/about', keywords: ['关于我', '个人介绍', '技能', '作品', '爱好'] }
)

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
