import DocsClient from './components/DocsClient'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import type { DocMeta } from './lib/docLoader'

export const dynamic = 'force-dynamic'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'

interface BackendDoc {
  id: number
  docId: string
  title: string
  description: string
  filename: string
  fileType: string
  docNamespace: string
  recommend: boolean
  viewCount: number
  createTime: string
}

async function getDocsFromBackend(): Promise<DocMeta[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const result = await res.json()
    if (result.flag && Array.isArray(result.data?.content || result.data)) {
      // 支持分页和非分页两种返回格式
      const docs = result.data?.content || result.data
      return (docs as BackendDoc[]).map((d) => {
        // 从 docNamespace 提取文件夹路径，如 "blog/docs/folder1" -> "folder1"
        const folderPath = d.docNamespace?.replace('blog/docs/', '').replace('blog/docs', '') || ''
        // 构建完整的相对路径：folderPath/filename
        const fullFilename = folderPath ? `${folderPath}/${d.filename}` : d.filename
        return {
          id: d.docId || String(d.id),
          docId: d.docId,
          title: d.title,
          description: d.description || '',
          filename: fullFilename,
          type: d.fileType || '',
          recommend: d.recommend,
          viewCount: d.viewCount,
          createTime: d.createTime ? d.createTime.split('T')[0] : '',
        }
      })
    }
    return []
  } catch {
    return []
  }
}

export default async function DocsPage() {
  const docs = await getDocsFromBackend()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "文档中心",
    "description": "值得保存分享的文档，包括作品、教程和参考资料",
    "numberOfItems": docs.length,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex-1 min-h-0 relative">
        <BgOverlay opacity={0.7}/>
        <div className="relative z-10 h-full">
          <DocsClient initialDocs={docs} />
        </div>
      </div>
    </>
  )
}
