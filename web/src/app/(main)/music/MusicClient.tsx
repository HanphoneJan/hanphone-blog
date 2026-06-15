'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  VolumeX,
  Volume2,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic
} from 'lucide-react'

const PLAYLIST_ID = '2093306814'
const MUSIC_API = '/next-api/music'

/** 构建代理 API URL */
function musicApiUrl(params: Record<string, string>): string {
  const sp = new URLSearchParams(params)
  return `${MUSIC_API}?${sp.toString()}`
}

interface Song {
  title: string
  author: string
  url: string
  pic: string
  lrc: string
  id: string
}

/** 逐词时间戳 */
interface WordTimestamp {
  start: number
  end: number
  text: string
}

/** 歌词行数据结构，支持逐词和双语 */
interface LyricLine {
  time: number
  text: string
  words: WordTimestamp[]
  translation?: string
}

/**
 * 解析 LRC 歌词文本
 * 支持标准 LRC 和逐词 LRC（网易云格式）
 * 逐词格式：[mm:ss.xx]word1[mm:ss.xx]word2... 或 [mm:ss.xx]<mm:ss.xx>word
 */
function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return []
  const lines = lrc.split('\n')
  const result: LyricLine[] = []

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    // 匹配行首时间戳 [mm:ss.xx] 或 [mm:ss.xxx]
    const lineMatch = line.match(/^(\[\d{2}:\d{2}\.\d{2,3}\])(.*)/)
    if (!lineMatch) continue

    const lineTime = parseTimestamp(lineMatch[1])
    const content = lineMatch[2]

    // 尝试解析逐词时间戳
    const words = parseWordTimestamps(content, lineTime)

    let text = content
    let translation: string | undefined

    // 清理逐词时间戳标记，提取纯文本
    if (words.length > 0) {
      text = words.map(w => w.text).join('')
    } else {
      // 移除内容中可能残留的逐词时间戳标记
      text = content.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '').trim()
    }

    // 双语歌词检测：检查下一行是否时间戳相同且是翻译
    if (idx + 1 < lines.length) {
      const nextLine = lines[idx + 1]
      const nextMatch = nextLine.match(/^(\[\d{2}:\d{2}\.\d{2,3}\])(.*)/)
      if (nextMatch) {
        const nextTime = parseTimestamp(nextMatch[1])
        // 时间戳相同（允许1ms误差），且内容不同，认为是翻译
        if (Math.abs(nextTime - lineTime) < 0.001) {
          const nextContent = nextMatch[2].replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '').trim()
          // 如果当前行是中文，下一行是英文（或反之），则认为是翻译
          if (nextContent && nextContent !== text) {
            translation = nextContent
            idx++ // 跳过下一行
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

/** 解析 [mm:ss.xx] 时间戳为秒数 */
function parseTimestamp(ts: string): number {
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
 * 2. [mm:ss.xx]<mm:ss.xx>word （开始时间<结束时间>词）
 */
function parseWordTimestamps(content: string, lineTime: number): WordTimestamp[] {
  const words: WordTimestamp[] = []

  // 格式1: [mm:ss.xx]word1[mm:ss.xx]word2...
  const pattern1 = /\[(\d{2}:\d{2}\.\d{2,3})\]([^\[]*)/g
  let match: RegExpExecArray | null
  let lastTime = lineTime
  let hasPattern1 = false

  while ((match = pattern1.exec(content)) !== null) {
    hasPattern1 = true
    const time = parseTimestamp(`[${match[1]}]`)
    const text = match[2]
    if (text) {
      words.push({ start: time, end: time, text })
      lastTime = time
    }
  }

  if (hasPattern1 && words.length > 0) {
    // 为每个词估算结束时间（下一个词的开始时间）
    for (let i = 0; i < words.length - 1; i++) {
      words[i].end = words[i + 1].start
    }
    // 最后一个词的结束时间：估算为开始时间 + 平均词时长
    if (words.length > 1) {
      const avgDuration = (words[words.length - 2].end - words[words.length - 2].start) || 0.3
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

function isLrcText(val: string): boolean {
  return /\[\d{2}:\d{2}[.\]]/.test(val)
}

function coverUrl(song: Song): string {
  if (!song) return ''
  if (song.pic?.startsWith('http')) {
    // http → https (浏览器安全策略)
    return song.pic.replace(/^http:/, 'https:')
  }
  const id = song.pic || song.id
  return musicApiUrl({ server: 'netease', type: 'pic', id })
}

type PlayMode = 'list' | 'single' | 'random'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 平滑滚动动画
 * 使用 ease-out 缓动函数，300ms 内完成滚动
 */
function smoothScrollTo(element: HTMLElement, target: number, duration: number = 300): (() => void) {
  const start = element.scrollTop
  const distance = target - start
  if (Math.abs(distance) < 1) return () => {}
  const startTime = performance.now()
  let cancelled = false
  let rafId = 0

  function cancel() {
    cancelled = true
    if (rafId) cancelAnimationFrame(rafId)
  }

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  function animate(currentTime: number) {
    if (cancelled) return
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOutCubic(progress)
    element.scrollTop = start + distance * eased
    if (progress < 1) {
      rafId = requestAnimationFrame(animate)
    }
  }

  rafId = requestAnimationFrame(animate)
  return cancel
}

export default function MusicClient() {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [playMode, setPlayMode] = useState<PlayMode>('list')
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([])

  // 用于 rAF 循环的高精度时间
  const rafTimeRef = useRef(0)
  const rafActiveRef = useRef(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const urlCache = useRef<Map<string, string>>(new Map())
  const seekOnLoad = useRef(-1)
  // 保存当前平滑滚动动画的取消函数，切歌时取消上一个动画
  const scrollCancelRef = useRef<(() => void) | null>(null)

  // 拉歌单
  useEffect(() => {
    let c = false
    fetch(musicApiUrl({ server: 'netease', type: 'playlist', id: PLAYLIST_ID }))
      .then(r => r.json())
      .then((data: Song[]) => {
        if (c) return
        if (Array.isArray(data) && data.length > 0) {
          setSongs(data)
          setStatus('ready')
        } else setStatus('error')
      })
      .catch(() => {
        if (!c) setStatus('error')
      })
    return () => {
      c = true
    }
  }, [])

  // 获取 / 解析歌词
  const loadLyrics = useCallback((song: Song) => {
    // song.lrc 可能是 LRC 文本，也可能是带签名的 URL
    if (song.lrc) {
      if (song.lrc.startsWith('http')) {
        // lrc 是 URL，fetch 获取歌词内容
        fetch(song.lrc)
          .then(r => r.text())
          .then(text => setLyrics(parseLrc(text)))
          .catch(() => setLyrics([]))
        return
      }
      // lrc 是纯文本
      const parsed = parseLrc(song.lrc)
      if (parsed.length > 0) {
        setLyrics(parsed)
        return
      }
    }
    // fallback: 调 API 获取
    if (song.id) {
      fetch(musicApiUrl({ server: 'netease', type: 'lrc', id: song.id }))
        .then(r => r.text())
        .then(text => setLyrics(parseLrc(text)))
        .catch(() => setLyrics([]))
    } else {
      setLyrics([])
    }
  }, [])

  // 获取歌曲播放 URL（含缓存）
  const getSongUrl = useCallback(
    async (song: Song): Promise<string> => {
      if (song.url) return song.url
      const cached = urlCache.current.get(song.id)
      if (cached) return cached
      try {
        const res = await fetch(musicApiUrl({ server: 'netease', type: 'song', id: song.id }))
        const data = await res.json()
        const url = data.url || ''
        if (url) urlCache.current.set(song.id, url)
        return url
      } catch {
        return ''
      }
    },
    []
  )

  // 播放指定歌曲
  const playSong = useCallback(
    async (index: number) => {
      const song = songs[index]
      if (!song || !audioRef.current) return
      setCurrentIndex(index)
      setCurrentTime(0)
      setDuration(0)
      loadLyrics(song)
      const url = await getSongUrl(song)
      if (!url) {
        setPlaying(false)
        return
      }
      audioRef.current.src = url
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
      // 移动端选中歌曲后自动收起播放列表
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setShowPlaylist(false)
      }
    },
    [songs, loadLyrics, getSongUrl]
  )

  // 选中歌曲（预加载但不自动播放）
  const selectSong = useCallback(
    async (index: number) => {
      const song = songs[index]
      if (!song) return
      setCurrentIndex(index)
      setCurrentTime(0)
      setDuration(0)
      setPlaying(false)
      loadLyrics(song)
      if (audioRef.current) {
        const url = await getSongUrl(song)
        if (url) {
          audioRef.current.src = url
          audioRef.current.load()
        }
      }
    },
    [songs, loadLyrics, getSongUrl]
  )

  // 切换播放模式
  const toggleMode = useCallback(() => {
    setPlayMode(prev => {
      const next = prev === 'list' ? 'single' : prev === 'single' ? 'random' : 'list'
      if (next === 'random' && songs.length > 0) {
        setShuffledOrder(shuffleArray(songs.map((_, i) => i)))
      }
      return next
    })
  }, [songs])

  // 切歌（支持播放模式）
  const getNextIndex = useCallback(
    (direction: 'next' | 'prev'): number => {
      if (songs.length === 0) return -1
      if (playMode === 'single') return currentIndex
      if (playMode === 'random') {
        const currentPos = shuffledOrder.indexOf(currentIndex)
        if (currentPos < 0) return shuffledOrder[0] ?? 0
        const nextPos =
          direction === 'next'
            ? (currentPos + 1) % shuffledOrder.length
            : (currentPos - 1 + shuffledOrder.length) % shuffledOrder.length
        return shuffledOrder[nextPos]
      }
      if (direction === 'next') {
        return currentIndex >= songs.length - 1 ? 0 : currentIndex + 1
      }
      return currentIndex <= 0 ? songs.length - 1 : currentIndex - 1
    },
    [currentIndex, songs.length, playMode, shuffledOrder]
  )

  const prev = useCallback(() => {
    const i = getNextIndex('prev')
    if (i >= 0) playSong(i)
  }, [getNextIndex, playSong])
  const next = useCallback(() => {
    const i = getNextIndex('next')
    if (i >= 0) playSong(i)
  }, [getNextIndex, playSong])

  // 加载完成后：优先恢复之前保存的播放状态，否则选中第一首
  useEffect(() => {
    if (status === 'ready' && songs.length > 0 && currentIndex < 0) {
      try {
        const raw = localStorage.getItem('music_player_state')
        if (raw) {
          const state = JSON.parse(raw) as { songId: string; currentTime: number; volume: number; playMode: PlayMode }
          const idx = songs.findIndex(s => s.id === state.songId)
          if (idx >= 0) {
            if (typeof state.volume === 'number') setVolume(state.volume)
            if (state.playMode) setPlayMode(state.playMode)
            if (typeof state.currentTime === 'number' && state.currentTime > 0) {
              seekOnLoad.current = state.currentTime
            }
            selectSong(idx)
            return
          }
        }
      } catch { /* ignore */ }
      selectSong(0)
    }
  }, [status, songs, currentIndex, selectSong])

  // 音频事件
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      const t = a.currentTime
      setCurrentTime(t)
      rafTimeRef.current = t
    }
    const onDur = () => {
      setDuration(a.duration || 0)
      if (seekOnLoad.current >= 0 && a.duration) {
        a.currentTime = Math.min(seekOnLoad.current, a.duration)
        seekOnLoad.current = -1
      }
    }
    const onEnd = () => {
      if (playMode === 'single') {
        a.currentTime = 0
        a.play().catch(() => setPlaying(false))
      } else {
        next()
      }
    }
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onDur)
    a.addEventListener('ended', onEnd)
    a.addEventListener('pause', onPause)
    a.addEventListener('play', onPlay)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onDur)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('play', onPlay)
    }
  }, [next, playMode])

  /**
   * rAF 循环：用于高精度歌词高亮更新
   * timeupdate 约 250ms 触发一次，rAF 约 16ms 一次，提供更平滑的高亮效果
   */
  useEffect(() => {
    if (!playing) {
      rafActiveRef.current = false
      return
    }
    rafActiveRef.current = true

    function rafLoop() {
      if (!rafActiveRef.current) return
      if (audioRef.current) {
        // 更新高精度时间，用于逐词高亮计算
        rafTimeRef.current = audioRef.current.currentTime
      }
      requestAnimationFrame(rafLoop)
    }

    const id = requestAnimationFrame(rafLoop)
    return () => {
      rafActiveRef.current = false
      cancelAnimationFrame(id)
    }
  }, [playing])

  // 歌词滚动：高亮行尽量在歌词区域垂直居中，使用平滑滚动动画
  useEffect(() => {
    if (!lyricsRef.current || lyrics.length === 0) return
    let curIdx = -1
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].time <= currentTime) {
        curIdx = i
        break
      }
    }
    if (curIdx >= 0 && lyricsRef.current) {
      const el = lyricsRef.current.children[curIdx] as HTMLElement
      if (el) {
        const container = lyricsRef.current
        const containerHeight = container.clientHeight
        const maxScrollTop = container.scrollHeight - containerHeight
        // 计算元素在容器内容中的位置（兼容各种定位场景）
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop
        // 目标位置：让高亮行位于容器上方约 35% 处（视觉重心偏上）
        const targetScrollTop = relativeTop + el.clientHeight / 2 - containerHeight * 0.35
        // 开头：不强制居中，紧贴顶部
        // 结尾：不强制居中，紧贴底部
        const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop))

        // 取消上一个滚动动画，开始新的平滑滚动
        if (scrollCancelRef.current) {
          scrollCancelRef.current()
        }
        scrollCancelRef.current = smoothScrollTo(container, finalScrollTop, 400)
      }
    }
  }, [currentTime, lyrics])

  // 切歌时取消未完成的滚动动画
  useEffect(() => {
    return () => {
      if (scrollCancelRef.current) {
        scrollCancelRef.current()
        scrollCancelRef.current = null
      }
    }
  }, [currentIndex])

  // 音量
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // 页面刷新前保存播放状态
  useEffect(() => {
    const save = () => {
      const song = songs[currentIndex]
      if (!song || currentIndex < 0) return
      try {
        localStorage.setItem(
          'music_player_state',
          JSON.stringify({
            songId: song.id,
            currentTime: audioRef.current?.currentTime || 0,
            volume,
            playMode,
          })
        )
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [songs, currentIndex, volume, playMode])

  // 进度条拖拽
  const getSeekRatio = useCallback((clientX: number) => {
    if (!progressRef.current) return 0
    const r = progressRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }, [])

  const seekTo = useCallback(
    (ratio: number) => {
      if (!audioRef.current || !duration) return
      audioRef.current.currentTime = ratio * duration
    },
    [duration]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      seekTo(getSeekRatio(e.clientX))
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [seekTo, getSeekRatio]
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      seekTo(getSeekRatio(e.clientX))
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [seekTo, getSeekRatio])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play().catch(() => {})
  }

  // 点击歌词跳转
  const handleLyricClick = useCallback((time: number) => {
    if (!audioRef.current || !duration) return
    audioRef.current.currentTime = time
    // 如果当前未播放，自动开始播放
    if (!playing) {
      audioRef.current.play().catch(() => {})
    }
  }, [duration, playing])

  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null
  const progressPct = duration ? (currentTime / duration) * 100 : 0
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60)
      .toString()
      .padStart(2, '0')}`
  }

  const modeIcons: Record<PlayMode, { icon: typeof Repeat; label: string }> = {
    list: { icon: Repeat, label: '列表循环' },
    single: { icon: Repeat1, label: '单曲循环' },
    random: { icon: Shuffle, label: '随机播放' }
  }
  const ModeIcon = modeIcons[playMode].icon

  /**
   * 计算当前高亮行索引
   * 使用 useMemo 避免每帧重复计算
   */
  const currentLyricIndex = useMemo(() => {
    if (lyrics.length === 0) return -1
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].time <= currentTime) {
        return i
      }
    }
    return -1
  }, [lyrics, currentTime])

  return (
    <div className="w-full relative z-10 flex flex-col">
      <audio ref={audioRef} preload="auto" />

      {status === 'loading' && <MusicSkeleton />}
      {status === 'error' && <MusicError />}

      {status === 'ready' && (
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* 主内容区 */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            {/* 左侧：播放列表 */}
            <div
              className={`
                ${showPlaylist ? 'fixed inset-x-0 top-14 bottom-[4.5rem] z-20 bg-[rgb(var(--bg))]' : 'hidden'}
                lg:static lg:block lg:top-auto lg:bottom-auto lg:z-auto lg:w-[42%] lg:min-w-[320px] lg:flex-shrink-0 lg:h-full lg:bg-transparent
                overflow-y-auto scrollbar-hide
              `}
            >
              <ol className="divide-y divide-[rgb(var(--border))]/40">
                {songs.map((song, i) => (
                  <li
                    key={song.id || i}
                    onClick={() => playSong(i)}
                    className={`flex items-center justify-between px-4 lg:px-5 py-2.5 cursor-pointer transition-colors text-sm ${
                      i === currentIndex
                        ? 'bg-[rgb(var(--primary))]/8 text-[rgb(var(--primary))]'
                        : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-5 text-center flex-shrink-0 text-xs tabular-nums text-[rgb(var(--text-muted))]">
                        {i === currentIndex && playing ? (
                          <span className="inline-flex gap-px items-end h-3">
                            <span
                              className="w-0.5 bg-[rgb(var(--primary))] rounded-full animate-pulse"
                              style={{ height: '60%' }}
                            />
                            <span
                              className="w-0.5 bg-[rgb(var(--primary))] rounded-full animate-pulse"
                              style={{ height: '100%', animationDelay: '.15s' }}
                            />
                            <span
                              className="w-0.5 bg-[rgb(var(--primary))] rounded-full animate-pulse"
                              style={{ height: '40%', animationDelay: '.3s' }}
                            />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="truncate">{song.title}</span>
                    </div>
                    <span className="text-xs text-[rgb(var(--text-muted))] ml-2 flex-shrink-0 truncate max-w-[120px]">
                      {song.author}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* 右侧：播放器 */}
            <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-4 lg:py-6 lg:border-l border-[rgb(var(--border))] min-h-0 overflow-y-auto lg:overflow-hidden">
              {/* 封面 */}
              <div
                className={`w-48 h-48 sm:w-52 sm:h-52 lg:w-56 lg:h-56 rounded-xl overflow-hidden shadow-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] mb-4 ${
                  playing ? 'animate-music-breathe' : ''
                }`}
              >
                {currentSong ? (
                  <img
                    src={coverUrl(currentSong)}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[rgb(var(--text-muted))]">
                    <ListMusic className="w-16 h-16" strokeWidth={1} />
                  </div>
                )}
              </div>

              {/* 标题 */}
              <h2 className="text-xl lg:text-2xl font-bold text-[rgb(var(--text))] text-center mb-1">
                {currentSong?.title || '选择一首歌'}
              </h2>
              <p className="text-base text-[rgb(var(--text-muted))] text-center mb-2">
                {currentSong?.author || '—'}
              </p>

              {/* 歌词：占据剩余空间，内部滚动 */}
              <div
                className="w-full max-w-2xl flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide text-center py-2 px-6"
                ref={lyricsRef}
              >
                {lyrics.length > 0 ? (
                  lyrics.map((l, i) => {
                    const isCurrent = i === currentLyricIndex
                    const isPast = i < currentLyricIndex
                    const isFuture = i > currentLyricIndex

                    return (
                      <div
                        key={i}
                        onClick={() => handleLyricClick(l.time)}
                        className={`
                          transition-all duration-300 cursor-pointer select-none
                          py-2 lg:py-2.5 px-2 rounded-lg
                          hover:bg-[rgb(var(--hover))]/50 active:bg-[rgb(var(--hover))]
                          ${isCurrent
                            ? 'text-[rgb(var(--text))] font-bold text-xl lg:text-2xl scale-105'
                            : isPast
                              ? 'text-[rgb(var(--text-muted))]/35 text-sm lg:text-base'
                              : 'text-[rgb(var(--text-muted))]/50 text-sm lg:text-base'
                          }
                        `}
                        style={isCurrent ? {
                          textShadow: '0 0 20px rgb(var(--primary) / 0.3), 0 0 40px rgb(var(--primary) / 0.15)'
                        } : undefined}
                      >
                        {/* 原文歌词行 */}
                        <div className="leading-relaxed">
                          {l.words.length > 0 ? (
                            // 逐词高亮渲染（Karaoke 效果）
                            <span className="inline-flex flex-wrap justify-center">
                              {l.words.map((word, wi) => {
                                // 使用 rafTimeRef 获取高精度时间，实现更平滑的逐词高亮
                                const time = rafTimeRef.current || currentTime
                                const isWordActive = time >= word.start
                                const isWordPast = time >= word.end
                                // 计算当前词的高亮进度（0-1）
                                let progress = 0
                                if (isWordPast) {
                                  progress = 1
                                } else if (isWordActive) {
                                  const duration = word.end - word.start
                                  progress = duration > 0
                                    ? Math.min(1, (time - word.start) / duration)
                                    : 1
                                }

                                return (
                                  <span
                                    key={wi}
                                    className="relative inline-block"
                                  >
                                    {/* 未高亮部分（背景文字） */}
                                    <span
                                      className={`
                                        transition-colors duration-100
                                        ${isCurrent ? 'text-[rgb(var(--text-muted))]/30' : ''}
                                      `}
                                    >
                                      {word.text}
                                    </span>
                                    {/* 高亮部分（前景文字，通过 clip 实现逐字效果） */}
                                    {isCurrent && (
                                      <span
                                        className="absolute inset-0 text-[rgb(var(--primary))] overflow-hidden whitespace-nowrap"
                                        style={{
                                          clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`
                                        }}
                                      >
                                        {word.text}
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </span>
                          ) : (
                            // 无逐词时间戳，整行显示
                            l.text
                          )}
                        </div>
                        {/* 翻译歌词（双语支持） */}
                        {l.translation && (
                          <div className={`
                            text-xs lg:text-sm mt-1 transition-all duration-300
                            ${isCurrent
                              ? 'text-[rgb(var(--text-muted))]/60'
                              : 'text-[rgb(var(--text-muted))]/30'
                            }
                          `}>
                            {l.translation}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center text-sm text-[rgb(var(--text-muted))]/50 py-8">
                    {currentSong ? '暂无歌词' : '从左侧播放列表选择歌曲'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部控制条 */}
          <div className="px-4 py-3 bg-[rgb(var(--bg))]/90 backdrop-blur-sm border-t border-[rgb(var(--border))] z-20">
            {/* 进度条 */}
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))] mb-2">
              <span className="w-10 text-right tabular-nums">{fmt(currentTime)}</span>
              <div
                ref={progressRef}
                onPointerDown={handlePointerDown}
                className="flex-1 h-1.5 bg-[rgb(var(--border))] rounded-full cursor-pointer relative touch-none select-none"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[rgb(var(--primary))] rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[rgb(var(--primary))] rounded-full shadow"
                  style={{ left: `calc(${progressPct}% - 6px)` }}
                />
              </div>
              <span className="w-10 tabular-nums">{fmt(duration)}</span>
            </div>

            {/* 按钮：移动端 play 居中，两侧分排 */}
            <div className="flex items-center justify-between relative">
              {/* 左侧：移动端播放模式 + 音量；桌面端音量 */}
              <div className="flex items-center gap-1 lg:hidden">
                <button
                  onClick={toggleMode}
                  className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  title={modeIcons[playMode].label}
                >
                  <ModeIcon className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-lg">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="h-24 accent-[rgb(var(--primary))] cursor-pointer"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 左侧：音量（桌面端） */}
              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-lg">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="h-24 accent-[rgb(var(--primary))] cursor-pointer"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 中间：播放控制（始终居中） */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  onClick={prev}
                  className="p-1.5 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-[rgb(var(--primary))] text-white hover:opacity-85 transition-opacity shadow-md"
                >
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button
                  onClick={next}
                  className="p-1.5 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              {/* 右侧：移动端播放列表 / 桌面端播放模式 */}
              <div className="flex items-center">
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors lg:hidden"
                >
                  <ListMusic className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleMode}
                  className="hidden lg:block p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  title={modeIcons[playMode].label}
                >
                  <ModeIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes music-breathe {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 25px rgb(var(--primary) / 0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 16px 40px rgb(var(--primary) / 0.22);
          }
        }
        .animate-music-breathe {
          animation: music-breathe 4s ease-in-out infinite;
          will-change: transform, box-shadow;
        }
      `}</style>
    </div>
  )
}

function MusicSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden animate-pulse">
      {/* 主内容区 —— 与真实布局完全一致 */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 左侧：播放列表骨架 */}
        <div className="hidden lg:block lg:w-[42%] lg:min-w-[320px] flex-shrink-0 lg:h-full lg:overflow-hidden p-4">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-5 flex-shrink-0" />
                <div className="h-4 rounded bg-[rgb(var(--card))] flex-1" />
                <div className="h-3 w-16 rounded bg-[rgb(var(--card))]" />
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：播放器骨架 */}
        <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-4 lg:py-6 lg:border-l border-[rgb(var(--border))] min-h-0">
          {/* 封面 */}
          <div className="w-48 h-48 sm:w-52 sm:h-52 lg:w-56 lg:h-56 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] mb-4" />
          {/* 标题 */}
          <div className="h-6 w-48 rounded bg-[rgb(var(--card))] mb-1" />
          {/* 作者 */}
          <div className="h-4 w-24 rounded bg-[rgb(var(--card))] mb-2" />
          {/* 歌词区 */}
          <div className="w-full max-w-2xl flex-1 px-6 space-y-2 py-2">
            {[60, 35, 50, 40, 55].map((w, i) => (
              <div key={i} className="flex justify-center">
                <div className="h-4 rounded bg-[rgb(var(--card))]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部控制条骨架 */}
      <div className="px-4 py-3 bg-[rgb(var(--bg))]/90 backdrop-blur-sm border-t border-[rgb(var(--border))]">
        {/* 进度条 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-10 rounded bg-[rgb(var(--card))]" />
          <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--border))]" />
          <div className="h-3 w-10 rounded bg-[rgb(var(--card))]" />
        </div>
        {/* 按钮 */}
        <div className="flex items-center justify-center gap-3">
          {/* 左按钮 */}
          <div className="h-9 w-9 rounded-full bg-[rgb(var(--card))]" />
          {/* 播放按钮 */}
          <div className="h-12 w-12 rounded-full bg-[rgb(var(--card))]" />
          {/* 右按钮 */}
          <div className="h-9 w-9 rounded-full bg-[rgb(var(--card))]" />
        </div>
      </div>
    </div>
  )
}

function MusicError() {
  return (
    <div className="flex items-center justify-center h-64 text-[rgb(var(--text-muted))]">
      <div className="text-center space-y-2">
        <ListMusic className="w-12 h-12 mx-auto opacity-40" />
        <p className="text-base">音乐加载失败，请刷新重试</p>
      </div>
    </div>
  )
}
