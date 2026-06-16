import type { LyricLine, WordTimestamp } from './types'

/**
 * 解析 [mm:ss.xx] 时间戳为秒数
 */
export function parseTimestamp(ts: string): number {
  const m = ts.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/)
  if (!m) return 0
  const min = parseInt(m[1])
  const sec = parseInt(m[2])
  const ms = m[3].length === 2 ? parseInt(m[3]) * 10 : parseInt(m[3])
  return min * 60 + sec + ms / 1000
}

/**
 * 解析逐词时间戳
 * 支持格式：
 * 1. [mm:ss.xx]word1[mm:ss.xx]word2...
 * 2. [mm:ss.xx]<mm:ss.xx>word
 */
function parseWordTimestamps(content: string): WordTimestamp[] {
  const words: WordTimestamp[] = []

  // 格式1: [mm:ss.xx]word1[mm:ss.xx]word2...
  const pattern1 = /\[(\d{2}:\d{2}\.\d{2,3})\]([^\[]*)/g
  let match: RegExpExecArray | null
  let hasPattern1 = false

  while ((match = pattern1.exec(content)) !== null) {
    hasPattern1 = true
    const time = parseTimestamp(`[${match[1]}]`)
    const text = match[2]
    if (text) {
      words.push({ start: time, end: time, text })
    }
  }

  if (hasPattern1 && words.length > 0) {
    for (let i = 0; i < words.length - 1; i++) {
      words[i].end = words[i + 1].start
    }
    if (words.length > 1) {
      const avgDuration = words[words.length - 2].end - words[words.length - 2].start || 0.3
      words[words.length - 1].end = words[words.length - 1].start + avgDuration
    } else {
      words[0].end = words[0].start + 1
    }
    return words
  }

  // 格式2: [mm:ss.xx]<mm:ss.xx>word
  const pattern2 = /\[(\d{2}:\d{2}\.\d{2,3})\]<(\d{2}:\d{2}\.\d{2,3})>([^\[]*)/g
  while ((match = pattern2.exec(content)) !== null) {
    const start = parseTimestamp(`[${match[1]}]`)
    const end = parseTimestamp(`[${match[2]}]`)
    const text = match[3]
    if (text) {
      words.push({ start, end, text })
    }
  }

  return words
}

/**
 * 解析 LRC 歌词文本
 * 支持标准 LRC 和逐词 LRC（网易云格式）
 */
export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return []
  const lines = lrc.split('\n')
  const result: LyricLine[] = []

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    const lineMatch = line.match(/^(\[\d{2}:\d{2}\.\d{2,3}\])(.*)/)
    if (!lineMatch) continue

    const lineTime = parseTimestamp(lineMatch[1])
    const content = lineMatch[2]
    const words = parseWordTimestamps(content)

    let text = content
    let translation: string | undefined

    if (words.length > 0) {
      text = words.map(w => w.text).join('')
    } else {
      text = content
        .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
        .replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '')
        .trim()
    }

    // 双语歌词检测
    if (idx + 1 < lines.length) {
      const nextLine = lines[idx + 1]
      const nextMatch = nextLine.match(/^(\[\d{2}:\d{2}\.\d{2,3}\])(.*)/)
      if (nextMatch) {
        const nextTime = parseTimestamp(nextMatch[1])
        if (Math.abs(nextTime - lineTime) < 0.001) {
          const nextContent = nextMatch[2]
            .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
            .replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '')
            .trim()
          if (nextContent && nextContent !== text) {
            translation = nextContent
            idx++
          }
        }
      }
    }

    if (text) {
      result.push({ time: lineTime, text, words, translation })
    }
  }

  return result
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
