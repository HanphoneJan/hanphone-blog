import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '工具箱',
  '实用工具箱 - 收录各类在线实用工具，包括计算器、图片压缩、Markdown 转换器等。',
  { path: '/tools', keywords: ['工具', '工具箱', '在线工具', '计算器', '图片压缩', 'Markdown'] }
)

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
