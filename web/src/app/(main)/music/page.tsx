import { createMetadata } from '@/lib/seo-config'
import MusicClient from './MusicClient'
import BgOverlay from '@/app/(main)/components/BgOverlay'

export const metadata = createMetadata(
  '音乐库',
  '寒枫的音乐库 - 在线收听喜欢的音乐',
  {
    path: '/music/',
    keywords: ['音乐', '音乐库', '歌单', '网易云音乐', '在线听歌'],
  }
)

export default function MusicPage() {
  return (
    <>
      <BgOverlay />
      <MusicClient />
    </>
  )
}
