'use client'

import { usePersonalProfile } from '@/hooks/usePersonalProfile'
import BgOverlay from '@/app/(main)/components/BgOverlay'
import HeroSection from './sections/HeroSection'
import SkillsSection from './sections/SkillsSection'
import WorksSection from './sections/WorksSection'
import HobbiesSection from './sections/HobbiesSection'
import EvaluationsSection from './sections/EvaluationsSection'
import ContactSection from './sections/ContactSection'

interface Item {
  id: number
  category: 'skill' | 'work' | 'hobby' | 'evaluation'
  name: string
  description: string | null
  pic_url: string | null
  url: string | null
  icon_src: string | null
  rank: number | null
}

interface PersonalClientProps {
  initialData: Item[]
}

const sortByRank = (items: Item[]): Item[] => {
  return [...items].sort((a, b) => {
    const aRank = a.rank === null || a.rank === 0 ? Infinity : a.rank
    const bRank = b.rank === null || b.rank === 0 ? Infinity : b.rank
    return aRank - bRank
  })
}

export default function PersonalClient({ initialData }: PersonalClientProps) {
  const { profile, socialLinks, internalLinks } = usePersonalProfile()

  const data = {
    skills: sortByRank(initialData.filter(item => item.category === 'skill')),
    works: sortByRank(initialData.filter(item => item.category === 'work')),
    hobbies: sortByRank(initialData.filter(item => item.category === 'hobby')),
    evaluations: sortByRank(initialData.filter(item => item.category === 'evaluation'))
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <BgOverlay />
      <main className="relative z-10 pb-8">
        <HeroSection profile={profile} socialLinks={socialLinks} />
        <SkillsSection skills={data.skills} />
        <WorksSection works={data.works} />
        <HobbiesSection hobbies={data.hobbies} />
        <EvaluationsSection evaluations={data.evaluations} />
        <ContactSection internalLinks={internalLinks} />
      </main>
    </div>
  )
}
