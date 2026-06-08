import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '小练习',
  '创意实验室 - 收录各类创意网页小练习，包括粒子系统、互动动画、趣味实验等。',
  { path: '/play', keywords: ['小练习', '创意', '动画', '粒子', 'Canvas', '交互', '实验'] }
)

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
