'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import { Heart, Music, Video, Dumbbell, Book, Gamepad, Code } from 'lucide-react'

interface Hobby {
  id: number
  name: string
  description: string | null
  pic_url: string | null
  url: string | null
  icon_src: string | null
}

interface HobbiesSectionProps {
  hobbies: Hobby[]
}

const iconMap: Record<string, React.ReactNode> = {
  music: <Music className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  sport: <Dumbbell className="w-4 h-4" />,
  literature: <Book className="w-4 h-4" />,
  game: <Gamepad className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
}

export default function HobbiesSection({ hobbies }: HobbiesSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section ref={ref} className="py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {hobbies.map((hobby, index) => {
            const Wrapper = hobby.url ? motion.a : motion.div
            return (
              <Wrapper
                key={hobby.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 150,
                  damping: 12
                }}
                whileHover={{ 
                  y: -8,
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 300 }
                }}
                href={hobby.url || undefined}
                target={hobby.url ? "_blank" : undefined}
                rel={hobby.url ? "noopener noreferrer" : undefined}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[rgb(var(--card))] border border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)] hover:shadow-xl hover:shadow-[rgb(var(--primary)/0.1)] transition-all"
              >
                {hobby.pic_url ? (
                  <Image
                    src={hobby.pic_url}
                    alt={hobby.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-[rgb(var(--primary)/0.15)] to-[rgb(var(--primary)/0.05)]" />
                )}
                {/* 默认状态：底部渐变遮罩显示名称 */}
                <div className="absolute inset-0 bg-linear-to-t from-[rgb(var(--bg)/0.75)] via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-0" />
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 p-2 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[rgb(var(--primary))]">
                      {iconMap[hobby.icon_src || ''] || <Heart className="w-3 h-3" />}
                    </span>
                    <span className="text-xs font-medium text-[rgb(var(--card-foreground))] truncate">
                      {hobby.name}
                    </span>
                  </div>
                </motion.div>
                {/* 悬浮状态：显示 description */}
                <div 
                  className="absolute inset-0 bg-[rgb(var(--bg)/0.8)] backdrop-blur-sm flex flex-col justify-center items-center p-3 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <span className="text-[rgb(var(--primary))] mb-1.5">
                    {iconMap[hobby.icon_src || ''] || <Heart className="w-5 h-5" />}
                  </span>
                  <span className="text-xs font-medium text-[rgb(var(--card-foreground))] mb-1">
                    {hobby.name}
                  </span>
                  {hobby.description && (
                    <span className="text-[10px] leading-relaxed text-[rgb(var(--muted-foreground))] line-clamp-4">
                      {hobby.description}
                    </span>
                  )}
                </div>
              </Wrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}
