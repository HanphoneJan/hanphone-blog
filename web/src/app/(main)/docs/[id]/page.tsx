import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/seo-config'
import { getDocById } from '../lib/docLoader'
import type { DocMeta } from '../lib/docLoader'
import DocDetailClient from './components/DocDetailClient'
import BgOverlay from '@/app/(main)/components/BgOverlay'

export const dynamic = 'force-dynamic'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8090/api'

interface BackendDoc {
  id: number
  docId: string
  title: string
  description: string
  filename: string
  fileType: string
  recommend: boolean
  createTime: string
}

async function getDocsFromBackend(): Promise<DocMeta[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const result = await res.json()
    if (result.flag && Array.isArray(result.data)) {
      return (result.data as BackendDoc[]).map((d) => ({
        id: d.docId || String(d.id),
        docId: d.docId,
        title: d.title,
        description: d.description || '',
        filename: d.filename,
        type: d.fileType || '',
        recommend: d.recommend,
        createTime: d.createTime ? d.createTime.split('T')[0] : '',
      }))
    }
    return []
  } catch {
    return []
  }
}

interface DocPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DocPageProps) {
  const { id } = await params
  const docs = await getDocsFromBackend()

  const docMeta = docs.find(d => {
    if (d.id === id || d.docId === id) return true
    const nameWithoutExt = d.filename.replace(/\.[^.]+$/, '')
    const decodedId = decodeURIComponent(id)
    return nameWithoutExt === id || nameWithoutExt === decodedId
  })

  if (!docMeta) {
    return createMetadata(
      '文档未找到',
      '抱歉，您访问的文档不存在或已被删除。',
      { noIndex: true }
    )
  }

  return createMetadata(
    docMeta.title,
    docMeta.description,
    {
      path: `/docs/${id}`,
      type: 'article',
      publishedTime: docMeta.createTime
    }
  )
}

export default async function DocPage({ params }: DocPageProps) {
  const { id } = await params

  const docList = await getDocsFromBackend()
  const docData = await getDocById(id)

  if (!docData) {
    notFound()
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": docData.meta.title,
    "description": docData.meta.description,
    "datePublished": docData.meta.createTime,
    "author": {
      "@type": "Person",
      "name": "寒枫",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col min-h-0 bg-[rgb(var(--bg))] h-[calc(100dvh-53px)]">
        {/* 背景 */}
        <BgOverlay opacity={0.5} />
        <DocDetailClient docId={id} docList={docList} initialDoc={docData} />
      </div>
    </>
  )
}
