'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MessageCircle, BookImage } from 'lucide-react'
import Link from 'next/link'

interface ContactSectionProps {
  internalLinks: {
    atlas?: { href: string; text: string }
    privateChat?: { href: string; text: string }
  }
}

export default function ContactSection({ internalLinks }: ContactSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const items = [
    ...(internalLinks.atlas ? [{ icon: <BookImage className="w-4 h-4" />, label: internalLinks.atlas.text, href: internalLinks.atlas.href, external: false }] : []),
    ...(internalLinks.privateChat ? [{ icon: <MessageCircle className="w-4 h-4" />, label: internalLinks.privateChat.text, href: internalLinks.privateChat.href, external: false }] : []),
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1
      }
    }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15
      }
    }
  }

  return (
    <section ref={ref} className="py-4 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-wrap justify-center gap-2"
        >
          {items.map((item, index) => {
            const Wrapper = item.external ? motion.a : motion(Link)
            return (
              <Wrapper
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.08,
                  y: -3,
                  boxShadow: "0 4px 14px rgba(var(--primary), 0.15)",
                  transition: { type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.95 }}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)] transition-colors text-xs"
              >
                <motion.span 
                  className="text-[rgb(var(--primary))]"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  {item.icon}
                </motion.span>
                <span className="text-[rgb(var(--card-foreground))]">{item.label}</span>
              </Wrapper>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
