import { createMetadata } from '@/lib/seo-config'
import './docs.css'

export const metadata = createMetadata(
  '文库',
  '整理的技术文件、教程和参考资料，方便查阅和学习。',
  { path: '/docs', keywords: ['文库', '技术文件', '教程', '参考资料', '知识库'] }
)

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
