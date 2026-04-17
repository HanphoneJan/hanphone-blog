import LinkClient from './LinkClient'

// 生成元数据
export const metadata = {
  title: '友情链接 | 寒枫的博客',
  description: '寒枫的博客友情链接页面，包含技术博客、实用工具、学习资源等精选链接。欢迎交换友链！',
  keywords: '友情链接,友链,技术博客,工具推荐,资源分享'
}

// 服务端组件
export default function LinkPage() {
  return <LinkClient />
}
