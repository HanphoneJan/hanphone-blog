'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import { FileText, Shield, User, Clock, Mail, Cookie, Lock } from 'lucide-react'

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

export default function PrivacyClient() {
  const sections = [
    {
      id: 1,
      title: '引言',
      icon: User,
      content: '使用本网站即表示您同意按照本隐私政策收集和使用您的信息。如果您不同意本隐私政策的任何部分，请不要使用本网站。'
    },
    {
      id: 2,
      title: '我们收集的信息',
      icon: Mail,
      content: '当您访问和使用本网站时，我们可能会收集以下类型的信息：',
      list: [
        <li key="1">
          <strong className="text-[rgb(var(--primary))]">个人身份信息</strong>
          ：当您在本网站上发表评论、订阅博客更新或联系我们时，您可能会自愿向我们提供个人身份信息，如您的姓名、电子邮件地址等。
        </li>,
        <li key="2">
          <strong className="text-[rgb(var(--primary))]">非个人身份信息</strong>
          ：当您与本网站交互时，我们可能会收集非个人身份信息，如您的浏览器类型、操作系统、访问设备、IP地址、访问时间和日期、访问的页面等。
        </li>
      ]
    },
    {
      id: 3,
      title: '我们如何使用收集的信息',
      icon: Shield,
      content: '我们可能会将收集到的信息用于以下目的：',
      list: [
        <li key="1">提供、运营和维护本网站</li>,
        <li key="2">改进、个性化和扩展本网站</li>,
        <li key="3">理解和分析您如何使用本网站</li>,
        <li key="4">开发新的产品、服务、功能和功能</li>,
        <li key="5">就本网站与您沟通，包括客户服务</li>,
        <li key="6">向您发送博客更新和其他相关信息（仅当您订阅时）</li>,
        <li key="7">检测和防止欺诈活动</li>
      ]
    },
    {
      id: 4,
      title: 'Cookie 的使用',
      icon: Cookie,
      content: '本网站使用 "cookie" 来增强用户体验。Cookie 是网站放置在您计算机上的小型数据文件。您的浏览器会将 cookie 存储在您的计算机硬盘上。我们使用 cookie 来收集信息并改进我们的服务。您可以指示您的浏览器拒绝所有 cookie 或在发送 cookie 时提示您。但是，如果您不接受 cookie，您可能无法使用本网站的某些部分。'
    },
    {
      id: 5,
      title: '第三方服务',
      icon: Shield,
      content: '本网站可能包含指向第三方网站、服务和产品的链接。这些第三方网站有其自己的隐私政策，我们对这些第三方的隐私实践不承担任何责任。我们建议您在访问这些第三方网站前查看其隐私政策。本网站可能使用第三方服务（如 Google Analytics）来帮助分析如何使用本网站。这些服务可能会收集有关您使用网站的信息，包括您的 IP 地址、设备信息等。'
    },
    {
      id: 6,
      title: '信息安全',
      icon: Lock,
      content: '我们重视您的信息安全，并采取合理的安全措施来保护您提供给我们的信息免受未授权访问、使用或披露。然而，请注意，互联网上的任何传输都不是100%安全的，我们不能保证您信息的绝对安全。'
    },
    {
      id: 7,
      title: '隐私政策的变更',
      icon: Clock,
      content: '我们可能会不时更新本隐私政策。当我们这样做时，我们会在本页面上修订"最后更新"日期。建议您定期查看本隐私政策，以了解我们如何保护您的信息。您继续使用本网站即表示您接受任何修改后的隐私政策。'
    },
    {
      id: 8,
      title: '联系我们',
      icon: Mail,
      content: '如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：',
      contact: 'Janhizian@163.com'
    }
  ]

  return (
    <motion.div 
      className="min-h-screen z-1 flex flex-col bg-[rgb(var(--bg)/0.8)] text-[rgb(var(--text))] overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
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
              <FileText className="text-[rgb(var(--primary))] text-2xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--primary))]">
              隐私条款
            </h1>
          </motion.div>

          <motion.p 
            className="text-[rgb(var(--text-muted))] mb-8"
            variants={itemVariants}
          >
            欢迎使用我的个人博客网站（以下简称"本网站"）。保护您的隐私对我们非常重要。
            本隐私政策解释了我们如何收集、使用、披露、保存和保护您的信息。
            您对本网站的使用将被视为您已接受并同意本政策的全部条款。
          </motion.p>

          {sections.map((section, index) => {
            const IconComponent = section.icon
            return (
              <motion.section 
                key={section.id}
                className="mb-10"
                variants={sectionVariants}
                custom={index}
              >
                <motion.h2 
                  className="text-2xl font-semibold mb-4 text-[rgb(var(--primary))] border-l-4 border-[rgb(var(--primary))] pl-3 flex items-center"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <IconComponent className="mr-2" />
                  {section.id}. {section.title}
                </motion.h2>
                <p className="mb-4 leading-relaxed text-[rgb(var(--text))]">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="list-disc pl-6 mb-4 space-y-2 text-[rgb(var(--text))]">
                    {section.list}
                  </ul>
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
            )
          })}

          <motion.section 
            className="mt-12 pt-6 border-t border-[rgb(var(--border)/0.5)]"
            variants={itemVariants}
          >
            <div className="flex items-center text-[rgb(var(--text-muted))]">
              <FileText className="text-[rgb(var(--success))] mr-2" />
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
              <Link
                href="/terms"
                className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors"
              >
                用户协议
              </Link>
              <span className="text-[rgb(var(--border))]">|</span>
              <Link href="/privacy" className="text-[rgb(var(--primary))] font-medium">
                隐私政策
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  )
}
