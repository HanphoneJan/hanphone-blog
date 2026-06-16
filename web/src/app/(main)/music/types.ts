export interface Song {
  title: string
  author: string
  url: string
  pic: string
  lrc: string
  id: string
}

export interface WordTimestamp {
  start: number
  end: number
  text: string
}

export interface LyricLine {
  time: number
  text: string
  words: WordTimestamp[]
  translation?: string
}

export type PlayMode = 'list' | 'single' | 'random'
