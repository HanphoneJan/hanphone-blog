import ProjectClient from './ProjectClient'

// 生成元数据
export const metadata = {
  title: '项目展示 | 寒枫的博客',
  description: '探索寒枫的个人项目作品集，包括完整项目、实用工具、小游戏和编程练习。',
  keywords: '项目,作品集,工具,小游戏,编程练习,React,Next.js,前端开发'
}

// 服务端组件
export default function ProjectsPage() {
  return <ProjectClient />
}
