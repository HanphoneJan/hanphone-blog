import { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: '关于我',
  description: '了解更多 寒枫 的信息，包括技能、作品、爱好和评价。',
  keywords: '关于我,个人介绍,技能,作品,爱好,Hanphone，寒枫',
  authors: [{ name: '寒枫' }],
  openGraph: {
    title: '关于我',
    description: '了解更多 寒枫 的信息，包括技能、作品、爱好和评价。',
    type: 'website',
    url: `${SITE_URL}/personal`,
    siteName: '云林有风',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '关于我',
    description: '了解更多 寒枫 的信息，包括技能、作品、爱好和评价。',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
