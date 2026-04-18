import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/seo-config'
import { getDocMeta, getDocById } from '../lib/docLoader'
import DocDetailClient from './components/DocDetailClient'
import BgOverlay from '@/app/(main)/components/BgOverlay'

export const dynamic = 'force-dynamic'

interface DocPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DocPageProps) {
  const { id } = await params
  const meta = await getDocMeta()

  const docMeta = meta.docs.find(d => {
    if (d.id === id) return true
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

  const meta = await getDocMeta()
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
        <DocDetailClient docId={id} docList={meta.docs} initialDoc={docData} />
      </div>
    </>
  )
}
