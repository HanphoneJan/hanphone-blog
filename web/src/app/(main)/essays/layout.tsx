import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '随笔',
  '记录生活中的点滴，分享学习过程中的感悟和思考。沿途的风景很美，我想记录下来。',
  { path: '/essays', keywords: ['随笔', '随想', '生活记录', '学习感悟', '思考'] }
)

export default function EssayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
