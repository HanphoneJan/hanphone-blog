import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/seo-config'
import { getDocById } from '../lib/docLoader'
import type { DocMeta } from '../lib/docLoader'
import DocDetailClient from './components/DocDetailClient'

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
    // 支持分页（result.data.content）和非分页（result.data）两种返回格式
    if (result.flag && Array.isArray(result.data?.content || result.data)) {
      const docs = result.data?.content || result.data
      return (docs as BackendDoc[]).map((d) => {
        const folderPath = d.docNamespace?.replace('blog/docs/', '').replace('blog/docs', '') || ''
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
          docNamespace: d.docNamespace,
        }
      })
    }
    return []
  } catch {
    return []
  }
}

interface DocPageProps {
  params: Promise<{ id: string }>
}

// 静态导出：构建时预生成所有文档页面
export async function generateStaticParams() {
  const docs = await getDocsFromBackend()
  return docs.map((d) => ({ id: d.id }))
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
      '文件未找到',
      '抱歉，您访问的文件不存在或已被删除。',
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

  return (
    <DocDetailClient docId={id} docList={docList} initialDoc={docData} />
  )
}
