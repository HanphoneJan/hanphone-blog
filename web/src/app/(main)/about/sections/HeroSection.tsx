'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBilibili } from '@fortawesome/free-brands-svg-icons'

interface HeroSectionProps {
  profile: {
    name: string
    avatar: string
    description: string
    techDirection: string
    signature: string
  }
  socialLinks: {
    bilibili?: { url: string; displayName: string }
    github?: { url: string; displayName: string }
    email?: { address: string }
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12
    }
  }
}

export default function HeroSection({ profile, socialLinks }: HeroSectionProps) {
  return (
    <section className="relative pt-6 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center"
      >
        {/* 头像 */}
        <motion.div variants={itemVariants} className="mb-4">
          <motion.div 
            className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full p-1 bg-linear-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.3)]"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(var(--primary), 0)",
                "0 0 0 8px rgba(var(--primary), 0.1)",
                "0 0 0 0 rgba(var(--primary), 0)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div 
              className="w-full h-full rounded-full overflow-hidden bg-[rgb(var(--bg))]"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 名字 */}
        <motion.h1 
          variants={itemVariants}
          className="text-2xl md:text-3xl font-bold mb-2 text-[rgb(var(--card-foreground))]"
        >
          {profile.name}
        </motion.h1>

        {/* 描述 */}
        <motion.p 
          variants={itemVariants}
          className="text-sm text-[rgb(var(--muted-foreground))] mb-3"
        >
          {profile.description}
        </motion.p>

        {/* 技术标签 */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-1.5 mb-3"
        >
          {profile.techDirection.split('、').slice(0, 4).map((tech, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.08 }}
              whileHover={{ scale: 1.1, y: -2 }}
              className="px-2 py-0.5 rounded-full text-xs bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] cursor-default"
            >
              {tech}
            </motion.span>
          ))}
        </motion.div>

        {/* 签名 */}
        <motion.p 
          variants={itemVariants}
          className="text-xs text-[rgb(var(--muted-foreground))] italic mb-4"
        >
          {profile.signature}
        </motion.p>

        {/* 社交链接 */}
        <motion.div 
          variants={itemVariants}
          className="flex justify-center gap-2"
        >
          {socialLinks.github && (
            <motion.a
              href={socialLinks.github.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faGithub} className="text-sm" />
              <span>GitHub</span>
            </motion.a>
          )}
          {socialLinks.bilibili && (
            <motion.a
              href={socialLinks.bilibili.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faBilibili} className="text-sm text-[#FB7299]" />
              <span>Bilibili</span>
            </motion.a>
          )}
          {socialLinks.email && (
            <motion.a
              href={`mailto:${socialLinks.email.address}`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email</span>
            </motion.a>
          )}
        </motion.div>
      </motion.div>
    </section>
  )
}
