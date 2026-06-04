import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '项目',
  '探索个人项目作品集，包括完整项目、实用工具、小游戏和编程练习。',
  { path: '/projects', keywords: ['项目', '作品集', '工具', '小游戏', '编程练习'] }
)

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
