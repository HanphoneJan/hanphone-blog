import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'
import { Rss, Copy, ExternalLink, BookOpen, FileText, StickyNote, Briefcase, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'RSS 订阅',
  description: `订阅 ${SITE_CONFIG.name} 的 RSS 源，及时获取博客、随笔、项目、文档等最新内容`,
}

const CONTENT_TYPES = [
  { icon: FileText, name: '博客文章', desc: '技术文章、学习笔记、经验分享', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { icon: StickyNote, name: '随笔随想', desc: '生活感悟、日常记录、碎碎念', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { icon: Briefcase, name: '项目展示', desc: '开源项目、个人作品、技术实践', color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { icon: FolderOpen, name: '技术文档', desc: '教程文档、参考资料、知识库', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
]

export default function RssPage() {
  const rssUrl = `${SITE_URL}/rss.xml`

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
            <Rss className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            RSS 订阅
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            通过 RSS 订阅，第一时间获取博客、随笔、项目、文档等最新内容
          </p>
        </div>

        {/* 内容类型卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {CONTENT_TYPES.map((type) => (
            <div
              key={type.name}
              className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                <type.icon className={`w-5 h-5 ${type.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{type.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{type.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RSS 链接卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            订阅地址
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-sm text-gray-800 dark:text-gray-200 break-all font-mono">
              {rssUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(rssUrl)
                alert('RSS 链接已复制到剪贴板！')
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Copy className="w-4 h-4" />
              复制链接
            </button>
          </div>

          <a
            href={rssUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            查看 RSS 源
          </a>
        </div>

        {/* 使用说明 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            如何使用 RSS
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  选择 RSS 阅读器
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  推荐使用 <strong>Follow</strong>、<strong>Inoreader</strong>、<strong>Feedly</strong>、
                  <strong>Reeder</strong> 等专业 RSS 阅读器，也可以使用浏览器扩展或邮件订阅服务。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                2
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  添加订阅源
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  在阅读器中添加订阅，粘贴上方的 RSS 链接地址，即可开始接收更新。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  享受阅读
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  每当有新文章发布，你都会在阅读器中收到更新通知，不错过任何精彩内容。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 推荐的阅读器 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            推荐的 RSS 阅读器
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'Follow', desc: '新一代 RSS 阅读器', url: 'https://follow.is/' },
              { name: 'Inoreader', desc: '功能强大的云端阅读器', url: 'https://www.inoreader.com/' },
              { name: 'Feedly', desc: '流行的 RSS 聚合服务', url: 'https://feedly.com/' },
              { name: 'Reeder', desc: 'Apple 生态优秀阅读器', url: 'https://reederapp.com/' },
            ].map((reader) => (
              <a
                key={reader.name}
                href={reader.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                  {reader.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {reader.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {reader.desc}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* 返回首页 */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
