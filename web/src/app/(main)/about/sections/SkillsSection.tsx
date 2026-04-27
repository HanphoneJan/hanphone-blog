'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { Code, Music, Video, Dumbbell, Book, Gamepad } from 'lucide-react'

interface Skill {
  id: number
  name: string
  description: string | null
  icon_src: string | null
}

interface SkillsSectionProps {
  skills: Skill[]
}

const iconMap: Record<string, React.ReactNode> = {
  music: <Music className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  sport: <Dumbbell className="w-4 h-4" />,
  literature: <Book className="w-4 h-4" />,
  game: <Gamepad className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
}

export default function SkillsSection({ skills }: SkillsSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  return (
    <section ref={ref} className="py-4 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          className="flex flex-wrap justify-center gap-2"
        >
          {skills.map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ 
                delay: index * 0.04,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              whileHover={{ 
                scale: 1.08,
                y: -4,
                transition: { type: "spring", stiffness: 400 }
              }}
              onHoverStart={() => setHoveredId(skill.id)}
              onHoverEnd={() => setHoveredId(null)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-sm cursor-default overflow-visible"
            >
              <motion.span 
                className="text-[rgb(var(--primary))]"
                animate={{ rotate: hoveredId === skill.id ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                {iconMap[skill.icon_src || 'code'] || <Code className="w-4 h-4" />}
              </motion.span>
              <span className="text-[rgb(var(--card-foreground))]">{skill.name}</span>
              
              {/* Tooltip */}
              <AnimatePresence>
                {hoveredId === skill.id && skill.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50"
                  >
                    <div className="relative px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-lg min-w-35 max-w-55">
                      <p className="text-[11px] text-[rgb(var(--muted-foreground))] leading-relaxed text-center">
                        {skill.description}
                      </p>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[rgb(var(--border))]" />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[rgb(var(--card))] -mt-px" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
