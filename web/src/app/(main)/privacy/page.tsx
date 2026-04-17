import BgOverlay from '@/app/(main)/components/BgOverlay'
import PrivacyClient from './PrivacyClient'

// 生成静态元数据
export const metadata = {
  title: '隐私条款 | 寒枫的博客',
  description: '寒枫的个人博客隐私政策，解释我们如何收集、使用、披露、保存和保护您的信息。'
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <BgOverlay />
      <PrivacyClient />
    </>
  )
}
