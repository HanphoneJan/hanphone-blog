'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Evaluation {
  id: number
  name: string
}

interface EvaluationsSectionProps {
  evaluations: Evaluation[]
}

export default function EvaluationsSection({ evaluations }: EvaluationsSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section ref={ref} className="py-4 px-4 bg-[rgb(var(--muted)/0.3)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-2">
          {evaluations.map((evaluation, index) => (
            <motion.span
              key={evaluation.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ 
                delay: index * 0.05,
                type: "spring",
                stiffness: 200,
                damping: 12
              }}
              whileHover={{ 
                scale: 1.12,
                y: -3,
                boxShadow: "0 4px 12px rgba(var(--primary), 0.15)",
                borderColor: "rgb(var(--primary))",
                transition: { type: "spring", stiffness: 400 }
              }}
              className="px-3 py-1.5 rounded-full text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--card-foreground))] cursor-default transition-colors hover:bg-[rgb(var(--primary)/0.05)]"
            >
              {evaluation.name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}
