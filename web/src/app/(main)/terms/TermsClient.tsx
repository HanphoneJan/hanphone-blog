'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, Info, AlertCircle } from 'lucide-react'

// 动画变体定义
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const headerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4
    }
  }
}

export default function TermsClient() {
  const sections = [
    {
      id: 1,
      title: '协议接受',
      content: '本用户协议（以下简称"协议"）是您与本网站所有者之间关于您使用本网站的法律协议。一旦您访问、浏览或使用本网站，即表示您同意并接受本协议的全部条款和条件。如果您不同意本协议的任何条款，请立即停止使用本网站。'
    },
    {
      id: 2,
      title: '使用条款',
      list: [
        '您承诺在使用本网站时遵守所有适用的法律法规。',
        '您不得利用本网站发布、传播任何违法、有害、侮辱、诽谤、淫秽、暴力或其他不当内容。',
        '您不得尝试未经授权访问本网站的任何部分或相关系统。',
        '您不得干扰或破坏本网站的正常运行，包括但不限于通过黑客行为、病毒或其他恶意手段。',
        '您不得以任何形式复制、分发、修改、展示、传输或利用本网站的内容，除非获得明确书面许可。'
      ]
    },
    {
      id: 3,
      title: '知识产权',
      content: '本网站上的所有内容，包括但不限于文章、图片、视频、音频、文字、设计、代码等，均受知识产权法保护。除非另有说明，本网站的所有知识产权均归本网站所有者所有。',
      content2: '您可以出于个人、非商业目的浏览和使用本网站内容，但未经本网站所有者书面许可，不得将任何内容用于商业用途，不得复制、分发、修改或创作衍生作品。'
    },
    {
      id: 4,
      title: '用户评论',
      content: '本网站可能提供评论功能，您在发表评论时应遵守以下规定：',
      list: [
        '评论内容必须遵守法律法规和公序良俗。',
        '不得发表任何攻击性、侮辱性、诽谤性或其他不当言论。',
        '您应对自己发表的评论内容负责。'
      ],
      note: '本网站保留对任何评论进行审核、编辑或删除的权利，而无需事先通知或说明理由。'
    },
    {
      id: 5,
      title: '免责声明',
      warning: '本网站提供的内容仅供参考，不构成任何形式的建议或推荐。本网站所有者不对因使用或依赖本网站内容而造成的任何损失或损害承担责任。',
      content: '本网站将尽力确保所提供信息的准确性和完整性，但不对信息的绝对准确性和完整性做出任何明示或暗示的保证。本网站所有者保留随时修改、更新本网站内容的权利，而无需事先通知。'
    },
    {
      id: 6,
      title: '隐私保护',
      content: '本网站尊重并保护所有使用本网站用户的个人隐私权。关于您的个人信息的收集、使用和保护，请参阅我们的',
      link: { text: '隐私政策', href: '/privacy' }
    },
    {
      id: 7,
      title: '协议修改',
      content: '本网站所有者保留随时修改本协议的权利。任何修改将在本页面发布后立即生效。建议您定期查阅本协议，以了解最新条款。您继续使用本网站将被视为接受修改后的协议。'
    },
    {
      id: 8,
      title: '终止',
      content: '本网站所有者有权在任何时候，基于任何理由，终止或限制您对本网站的访问，而无需事先通知。本协议的条款在终止后仍然有效。'
    },
    {
      id: 9,
      title: '联系我们',
      content: '如果您对本用户协议有任何疑问或建议，请通过以下方式联系我们：',
      contact: 'janhizian@qq.com'
    }
  ]

  return (
    <motion.div 
      className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] text-[rgb(var(--text))] overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 主要内容 */}
      <main className="container mx-auto sm:px-4 max-w-4xl page-transition relative z-10">
        <motion.div 
          className="bg-[rgb(var(--bg)/0.85)] backdrop-blur-sm md:rounded-xl shadow-md p-8 border border-[rgb(var(--border))] transform transition-all duration-300 hover:shadow-lg hover:border-[rgb(var(--primary)/0.5)]"
          variants={itemVariants}
        >
          <motion.div 
            className="flex items-center mb-8"
            variants={headerVariants}
          >
            <div className="bg-[rgb(var(--primary)/0.1)] p-3 rounded-full mr-4">
              <Info className="text-[rgb(var(--primary))] text-2xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--primary))]">
              用户协议
            </h1>
          </motion.div>

          <motion.p 
            className="text-[rgb(var(--text-muted))] mb-8"
            variants={itemVariants}
          >
            欢迎使用我的个人博客网站（以下简称"本网站"）。在使用本网站前，请您仔细阅读以下用户协议。
            您对本网站的使用将被视为您已接受并同意本协议的全部条款。
          </motion.p>

          {sections.map((section, index) => (
            <motion.section 
              key={section.id}
              className="mb-10"
              variants={sectionVariants}
              custom={index}
            >
              <motion.h2 
                className="text-2xl font-semibold mb-4 text-[rgb(var(--primary))] border-l-4 border-[rgb(var(--primary))] pl-3"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                {section.id}. {section.title}
              </motion.h2>
              
              {section.content && (
                <p className="mb-4 text-[rgb(var(--text))]">
                  {section.content}
                  {section.link && (
                    <Link
                      href={section.link.href}
                      className="text-[rgb(var(--primary))] hover:underline ml-1"
                    >
                      {section.link.text}
                    </Link>
                  )}
                  {section.content.endsWith('。') ? '' : '。'}
                </p>
              )}
              
              {section.list && (
                <ul className="list-disc pl-6 space-y-2 text-[rgb(var(--text))]">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              
              {section.note && (
                <p className="text-[rgb(var(--text))] mt-4">{section.note}</p>
              )}
              
              {section.warning && (
                <div className="bg-[rgb(var(--warning)/0.1)] p-4 rounded-lg border border-[rgb(var(--warning)/0.3)] mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="text-[rgb(var(--warning))] mr-2 mt-1 shrink-0" />
                    <p className="text-[rgb(var(--warning))]">
                      {section.warning}
                    </p>
                  </div>
                </div>
              )}
              
              {section.content2 && (
                <p className="text-[rgb(var(--text))]">{section.content2}</p>
              )}
              
              {section.contact && (
                <div className="bg-[rgb(var(--primary)/0.1)] p-4 rounded-lg border border-[rgb(var(--primary)/0.3)]">
                  <p className="flex items-center">
                    <span className="font-medium md:mr-2">电子邮件：</span>
                    <a
                      href={`mailto:${section.contact}`}
                      className="text-[rgb(var(--primary))] hover:underline"
                    >
                      {section.contact}
                    </a>
                  </p>
                </div>
              )}
            </motion.section>
          ))}

          <motion.section 
            className="mt-12 pt-6 border-t border-[rgb(var(--border)/0.6)]"
            variants={itemVariants}
          >
            <div className="flex items-center text-[rgb(var(--text-muted))]">
              <CheckCircle className="text-[rgb(var(--success))] mr-2" />
              <p>最后更新日期：2025年9月9日</p>
            </div>
          </motion.section>
        </motion.div>
      </main>

      {/* 页脚 */}
      <motion.footer 
        className="bg-[rgb(var(--card)/0.8)] backdrop-blur-sm border-t border-[rgb(var(--border)/0.5)] py-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-[rgb(var(--text-muted))]">
                © {new Date().getFullYear()} 寒枫的个人博客. 保留所有权利.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-[rgb(var(--primary))] font-medium">
                用户协议
              </Link>
              <span className="text-[rgb(var(--border))]">|</span>
              <Link
                href="/privacy"
                className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
              >
                隐私政策
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  )
}
