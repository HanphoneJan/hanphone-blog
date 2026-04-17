import EssayClient from './EssayClient'

// 生成元数据
export const metadata = {
  title: '随笔 | 寒枫的博客',
  description: '阅读寒枫的生活随笔、技术心得和日常分享，记录生活中的点滴感悟。',
  keywords: '随笔,生活,技术心得,日常分享,博客'
}

// 服务端组件
export default function EssayPage() {
  return <EssayClient />
}
