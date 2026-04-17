'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface Work {
  id: number
  name: string
  description: string | null
  pic_url: string | null
  url: string | null
}

interface WorksSectionProps {
  works: Work[]
}

export default function WorksSection({ works }: WorksSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section ref={ref} className="py-4 px-4 bg-[rgb(var(--muted)/0.3)]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {works.map((work, index) => (
            <motion.div
              key={work.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ 
                delay: index * 0.08,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ 
                y: -6,
                transition: { type: "spring", stiffness: 400 }
              }}
              className="group flex gap-4 p-4 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)] hover:shadow-lg hover:shadow-[rgb(var(--primary)/0.05)] transition-all cursor-pointer"
            >
              {/* 图片 */}
              <motion.div 
                className="relative w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-lg overflow-hidden bg-[rgb(var(--muted))]"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {work.pic_url ? (
                  <Image
                    src={work.pic_url}
                    alt={work.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-[rgb(var(--primary)/0.2)] to-[rgb(var(--primary)/0.05)]" />
                )}
                {work.url && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-[rgb(var(--primary)/0.3)] flex items-center justify-center"
                  >
                    <ExternalLink className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </motion.div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[rgb(var(--card-foreground))] mb-1 truncate group-hover:text-[rgb(var(--primary))] transition-colors">
                  {work.url ? (
                    <a
                      href={work.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      {work.name}
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </motion.span>
                    </a>
                  ) : (
                    work.name
                  )}
                </h3>
                <motion.p 
                  className="text-xs text-[rgb(var(--muted-foreground))] line-clamp-3"
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1 }}
                >
                  {work.description}
                </motion.p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
