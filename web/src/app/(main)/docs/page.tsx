import { getDocMeta } from './lib/docLoader'
import DocsClient from './components/DocsClient'
import BgOverlay from '@/app/(main)/components/BgOverlay'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const { docs } = await getDocMeta()

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
