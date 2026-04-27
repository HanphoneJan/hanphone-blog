import { SITE_CONFIG, SITE_URL, createMetadata } from '@/lib/seo-config'
import { Rss, ExternalLink, BookOpen, FileText, StickyNote, Briefcase, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import CopyButton from './components/CopyButton'

export const metadata = createMetadata(
  'RSS 订阅',
  `订阅 ${SITE_CONFIG.name} 的 RSS 源，及时获取博客、随笔、项目、文档等最新内容`,
  { path: '/rss', keywords: ['RSS', '订阅', 'Feed'] }
)

const CONTENT_TYPES = [
  { icon: FileText, name: '博客文章', desc: '技术文章、学习笔记、经验分享', color: 'text-[rgb(var(--color-7))]', bgColor: 'bg-[rgb(var(--color-7)/0.1)]' },
  { icon: StickyNote, name: '随笔随想', desc: '生活感悟、日常记录、碎碎念', color: 'text-[rgb(var(--color-8))]', bgColor: 'bg-[rgb(var(--color-8)/0.1)]' },
  { icon: Briefcase, name: '项目展示', desc: '开源项目、个人作品、技术实践', color: 'text-[rgb(var(--color-6))]', bgColor: 'bg-[rgb(var(--color-6)/0.1)]' },
  { icon: FolderOpen, name: '技术文档', desc: '教程文档、参考资料、知识库', color: 'text-[rgb(var(--color-3))]', bgColor: 'bg-[rgb(var(--color-3)/0.1)]' },
]

export default function RssPage() {
  const rssUrl = `${SITE_URL}/rss.xml`

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative z-10 bg-[rgb(var(--bg)/0.8)]">
      <div className="max-w-3xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--primary)/0.1)] mb-6">
            <Rss className="w-10 h-10 text-[rgb(var(--primary))]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text))] mb-4">
            RSS 订阅
          </h1>
          <p className="text-lg text-[rgb(var(--text-muted))]">
            通过 RSS 订阅，第一时间获取博客、随笔、项目、文档等最新内容
          </p>
        </div>

        {/* 内容类型卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {CONTENT_TYPES.map((type) => (
            <div
              key={type.name}
              className="flex items-start gap-4 p-4 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                <type.icon className={`w-5 h-5 ${type.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(var(--text))]">{type.name}</h3>
                <p className="text-sm text-[rgb(var(--text-muted))]">{type.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RSS 链接卡片 */}
        <div className="bg-[rgb(var(--card))] rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-[rgb(var(--border))]">
          <h2 className="text-xl font-semibold text-[rgb(var(--text))] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[rgb(var(--primary))]" />
            订阅地址
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <code className="flex-1 bg-[rgb(var(--code-bg))] px-4 py-3 rounded-lg text-sm text-[rgb(var(--code-text))] break-all font-mono border border-[rgb(var(--border))]">
              {rssUrl}
            </code>
            <CopyButton text={rssUrl} />
          </div>

          <a
            href={rssUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            查看 RSS 源
          </a>
        </div>

        {/* 使用说明 */}
        <div className="bg-[rgb(var(--card))] rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-[rgb(var(--border))]">
          <h2 className="text-xl font-semibold text-[rgb(var(--text))] mb-6">
            如何使用 RSS
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--primary)/0.1)] flex items-center justify-center text-[rgb(var(--primary))] font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium text-[rgb(var(--text))] mb-2">
                  选择 RSS 阅读器
                </h3>
                <p className="text-[rgb(var(--text-muted))] text-sm leading-relaxed">
                  推荐使用 <strong className="text-[rgb(var(--text))]">Follow</strong>、<strong className="text-[rgb(var(--text))]">Inoreader</strong>、<strong className="text-[rgb(var(--text))]">Feedly</strong>、
                  <strong className="text-[rgb(var(--text))]">Reeder</strong> 等专业 RSS 阅读器，也可以使用浏览器扩展或邮件订阅服务。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--primary)/0.1)] flex items-center justify-center text-[rgb(var(--primary))] font-semibold">
                2
              </div>
              <div>
                <h3 className="font-medium text-[rgb(var(--text))] mb-2">
                  添加订阅源
                </h3>
                <p className="text-[rgb(var(--text-muted))] text-sm leading-relaxed">
                  在阅读器中添加订阅，粘贴上方的 RSS 链接地址，即可开始接收更新。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--primary)/0.1)] flex items-center justify-center text-[rgb(var(--primary))] font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium text-[rgb(var(--text))] mb-2">
                  享受阅读
                </h3>
                <p className="text-[rgb(var(--text-muted))] text-sm leading-relaxed">
                  每当有新文章发布，你都会在阅读器中收到更新通知，不错过任何精彩内容。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 返回首页 */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
