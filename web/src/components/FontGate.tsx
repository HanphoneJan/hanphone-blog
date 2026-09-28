'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { endGate } from '@/lib/font-gate'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function FontGate() {
  const pathname = usePathname()
  const mounted = useRef(false)

  useIsoLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    endGate()
  }, [pathname])

  return null
}
