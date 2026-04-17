import MessageClient from './MessageClient'

export const metadata = {
  title: '留言板 | 寒枫的博客',
  description: '在寒枫的博客留言板留下你的想法、建议或问候。欢迎交流讨论！',
  keywords: '留言板,评论,交流,互动,博客留言'
}

export default function MessagePage() {
  return <MessageClient />
}
