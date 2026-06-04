/**
 * 打字机效果Hook
 */

import { useState, useEffect } from 'react'
import { HOME_CONFIG } from '@/lib/constants'

interface UseTypewriterOptions {
  text: string
  interval?: number
  resetDelay?: number
  initDelay?: number
}

export function useTypewriter(options: UseTypewriterOptions) {
  const {
    text,
    interval = HOME_CONFIG.TYPEWRITER_INTERVAL,
    resetDelay = HOME_CONFIG.TYPEWRITER_RESET_DELAY,
    initDelay = HOME_CONFIG.TYPEWRITER_INIT_DELAY
  } = options

  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    let idx = 0
    let timer: NodeJS.Timeout

    const typeWriter = () => {
      if (idx <= text.length) {
        setDisplayText(text.substring(0, idx))
        idx++
        timer = setTimeout(typeWriter, interval)
      } else {
        idx = 0
        timer = setTimeout(typeWriter, resetDelay)
      }
    }

    timer = setTimeout(typeWriter, initDelay)
    return () => clearTimeout(timer)
  }, [text, interval, resetDelay, initDelay])

  return displayText
}
