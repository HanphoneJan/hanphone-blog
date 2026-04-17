/**
 * SEO配置文件 - 集中管理所有SEO相关配置
 * 修改域名或SEO配置时只需修改此文件
 */

// 从环境变量读取站点URL，默认为本地开发地址
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const SITE_CONFIG = {
  // 网站基础信息
  name: '云林有风',
  shortName: '云林有风',
  description: '寒枫的个人博客 | Hanphone\'s Blog | 分享Agent开发、前端开发、全栈开发、机器学习等技术文章，记录项目经验、生活经历，探究AI应用，探索自我发展。',

  // 域名配置
  url: siteUrl,
  
  // 作者信息
  author: {
    name: '寒枫',
    alternateName: 'Hanphone',
    email: 'janhizian@qq.com', // 可选：填写邮箱
  },
  
  // 社交媒体链接
  social: {
    github: 'https://github.com/hanphonejan',
    twitter: '@hanphone',
    bilibili:''
  },
  
  // 图片资源
  images: {
    ogImage: '/og-image.png',
    avatar: '/avatar.png',
    favicon: '/favicon.ico',
  },
  
  // 地区/语言
  locale: 'zh_CN',
  language: 'zh-CN',
  
  // 关键词
  keywords: [
    '寒枫',
    '云林有风',
    'Hanphone',
    '个人博客',
    '技术博客',
    '前端开发',
    'React',
    'Next.js',
    'TypeScript',
    'Node.js',
    'Python',
    'Java',
    'Javascript',
    '全栈开发',
    '后端有风',
    '机器学习',
    'Web开发',
    '编程学习',
    '技术分享',
  ],
  
  // 站点分类
  category: 'technology',
} as const

// 导出常用快捷方式
export const SITE_URL = SITE_CONFIG.url
export const SITE_NAME = SITE_CONFIG.name
