import BgOverlay from '@/app/(main)/components/BgOverlay'
import TermsClient from './TermsClient'

// 生成静态元数据
export const metadata = {
  title: '用户协议 | 寒枫的博客',
  description: '寒枫的个人博客用户协议，使用本网站前请仔细阅读。'
}

export default function TermsOfServicePage() {
  return (
    <>
      <BgOverlay />
      <TermsClient />
    </>
  )
}
