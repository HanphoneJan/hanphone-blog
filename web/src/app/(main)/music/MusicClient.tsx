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
import type { Song, LyricLine, PlayMode } from './types'
import { parseLrc, shuffleArray } from './utils'
import { PLAYLIST_ID, MUSIC_API_BASE, DEFAULT_VOLUME, LYRIC_SCROLL_DURATION, LYRIC_SCROLL_POSITION, USER_SCROLL_TIMEOUT, MOBILE_BREAKPOINT } from './constants'
import { STORAGE_KEYS } from '@/lib/constants'

export { Song, LyricLine, PlayMode }

function musicApiUrl(params: Record<string, string>): string {
  return `${MUSIC_API_BASE}?${new URLSearchParams(params)}`
}

async function fetchPlaylist(): Promise<Song[]> {
  const res = await fetch(musicApiUrl({ server: 'netease', type: 'playlist', id: PLAYLIST_ID }))
  return res.json()
}

async function fetchLyric(id: string): Promise<{ lyric: string; tlyric: string }> {
  const res = await fetch(musicApiUrl({ server: 'netease', type: 'lrc', id }))
  return res.json()
}

async function fetchSongUrl(id: string): Promise<string> {
  const res = await fetch(musicApiUrl({ server: 'netease', type: 'song', id }))
  const data = await res.json()
  return data.url || ''
}

function coverUrl(song: Song): string {
  if (!song) return ''
  if (song.pic?.startsWith('http')) {
    return song.pic.replace(/^http:/, 'https:')
  }
  const id = song.pic || song.id
  return musicApiUrl({ server: 'netease', type: 'pic', id })
}

function smoothScrollTo(element: HTMLElement, target: number, duration = LYRIC_SCROLL_DURATION): () => void {
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

  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3)
  }

  function animate(currentTime: number) {
    if (cancelled) return
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    element.scrollTop = start + distance * easeOutCubic(progress)
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
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [playMode, setPlayMode] = useState<PlayMode>('list')
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([])

  const rafTimeRef = useRef(0)
  const rafActiveRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const urlCache = useRef<Map<string, string>>(new Map())
  const seekOnLoad = useRef(-1)
  const scrollCancelRef = useRef<(() => void) | null>(null)
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleUserScroll = () => {
    userScrollingRef.current = true
    clearTimeout(userScrollTimerRef.current)
    userScrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false
    }, USER_SCROLL_TIMEOUT)
  }

  // 拉歌单
  useEffect(() => {
    let c = false
    fetchPlaylist()
      .then((data) => {
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
    if (song.lrc) {
      if (song.lrc.startsWith('http')) {
        fetch(song.lrc)
          .then(r => r.text())
          .then(text => setLyrics(parseLrc(text)))
          .catch(() => setLyrics([]))
        return
      }
      const parsed = parseLrc(song.lrc)
      if (parsed.length > 0) {
        setLyrics(parsed)
        return
      }
    }
    if (song.id) {
      fetchLyric(song.id)
        .then(({ lyric, tlyric }) => {
          const lyricLines = parseLrc(lyric || '')
          if (tlyric) {
            const tlyricLines = parseLrc(tlyric)
            const tlyricMap = new Map<number, string>()
            tlyricLines.forEach(l => tlyricMap.set(l.time, l.text))
            lyricLines.forEach(l => {
              const tl = tlyricMap.get(l.time)
              if (tl) l.translation = tl
            })
          }
          setLyrics(lyricLines)
        })
        .catch(() => setLyrics([]))
    } else {
      setLyrics([])
    }
  }, [])

  // 获取歌曲播放 URL（含缓存）
  const getSongUrl = useCallback(async (song: Song): Promise<string> => {
    if (song.url) return song.url
    const cached = urlCache.current.get(song.id)
    if (cached) return cached
    try {
      const url = await fetchSongUrl(song.id)
      if (url) urlCache.current.set(song.id, url)
      return url
    } catch {
      return ''
    }
  }, [])

  // 播放指定歌曲
  const playSong = useCallback(
    async (index: number) => {
      const song = songs[index]
      if (!song || !audioRef.current) return
      setCurrentIndex(index)
      setCurrentTime(0)
      setDuration(0)
      loadLyrics(song)
      userScrollingRef.current = false
      clearTimeout(userScrollTimerRef.current)
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
      if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) {
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
      userScrollingRef.current = false
      clearTimeout(userScrollTimerRef.current)
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

  // 恢复播放状态
  useEffect(() => {
    if (status === 'ready' && songs.length > 0 && currentIndex < 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MUSIC_PLAYER_STATE)
        if (raw) {
          const state = JSON.parse(raw) as {
            songId: string
            currentTime: number
            volume: number
            playMode: PlayMode
          }
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

  // rAF 循环：高精度歌词高亮更新
  useEffect(() => {
    if (!playing) {
      rafActiveRef.current = false
      return
    }
    rafActiveRef.current = true

    function rafLoop() {
      if (!rafActiveRef.current) return
      if (audioRef.current) {
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

  // 歌词滚动
  useEffect(() => {
    if (!lyricsRef.current || lyrics.length === 0) return
    if (userScrollingRef.current) return
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
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop
        const targetScrollTop = relativeTop + el.clientHeight / 2 - containerHeight * LYRIC_SCROLL_POSITION
        const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop))

        if (scrollCancelRef.current) {
          scrollCancelRef.current()
        }
        scrollCancelRef.current = smoothScrollTo(container, finalScrollTop)
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

  // 保存播放状态
  useEffect(() => {
    const save = () => {
      const song = songs[currentIndex]
      if (!song || currentIndex < 0) return
      try {
        localStorage.setItem(
          STORAGE_KEYS.MUSIC_PLAYER_STATE,
          JSON.stringify({
            songId: song.id,
            currentTime: audioRef.current?.currentTime || 0,
            volume,
            playMode
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

  const handleLyricClick = useCallback(
    (time: number) => {
      if (!audioRef.current || !duration) return
      audioRef.current.currentTime = time
      if (!playing) {
        audioRef.current.play().catch(() => {})
      }
    },
    [duration, playing]
  )

  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null
  const progressPct = duration ? (currentTime / duration) * 100 : 0
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const modeIcons: Record<PlayMode, { icon: typeof Repeat; label: string }> = {
    list: { icon: Repeat, label: '列表循环' },
    single: { icon: Repeat1, label: '单曲循环' },
    random: { icon: Shuffle, label: '随机播放' }
  }
  const ModeIcon = modeIcons[playMode].icon

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
            {/* 左侧：播放列表（移动端带滑入动效） */}
            <div
              className={`
                fixed inset-x-0 top-14 bottom-[4.5rem] z-20 bg-[rgb(var(--bg))]
                overflow-y-auto scrollbar-hide
                transition-all duration-300 ease-out
                ${showPlaylist ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible'}
                lg:static lg:opacity-100 lg:translate-y-0 lg:visible lg:block
                lg:top-auto lg:bottom-auto lg:z-auto lg:w-[42%] lg:min-w-[320px]
                lg:flex-shrink-0 lg:h-full lg:bg-transparent
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
              <div className="w-48 h-48 sm:w-52 sm:h-52 lg:w-56 lg:h-56 rounded-xl overflow-hidden bg-[rgb(var(--card))] border border-[rgb(var(--border))] mb-4">
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

              {/* 歌词 */}
              <div
                className="w-full max-w-2xl flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide text-center py-2 px-6"
                ref={lyricsRef}
                onWheel={handleUserScroll}
                onTouchStart={handleUserScroll}
              >
                {lyrics.length > 0 ? (
                  lyrics.map((l, i) => {
                    const isCurrent = i === currentLyricIndex
                    const isPast = i < currentLyricIndex

                    return (
                      <div
                        key={i}
                        onClick={() => handleLyricClick(l.time)}
                        className={`
                          transition-all duration-300 cursor-pointer select-none
                          py-2 lg:py-2.5 px-2 rounded-lg
                          hover:bg-[rgb(var(--hover))]/50 active:bg-[rgb(var(--hover))]
                          ${
                            isCurrent
                              ? 'text-[rgb(var(--text))] font-bold text-xl lg:text-2xl'
                              : isPast
                              ? 'text-[rgb(var(--text-muted))]/35 text-sm lg:text-base'
                              : 'text-[rgb(var(--text-muted))]/50 text-sm lg:text-base'
                          }
                        `}
                        style={
                          isCurrent
                            ? {
                                textShadow:
                                  '0 0 5px rgb(var(--primary) / 0.15), 0 0 10px rgb(var(--primary) / 0.1)'
                              }
                            : undefined
                        }
                      >
                        <div className="leading-relaxed">
                          {l.words.length > 0 ? (
                            <span className="inline-flex flex-wrap justify-center">
                              {l.words.map((word, wi) => {
                                const time = rafTimeRef.current || currentTime
                                const isWordActive = time >= word.start
                                const isWordPast = time >= word.end
                                let progress = 0
                                if (isWordPast) {
                                  progress = 1
                                } else if (isWordActive) {
                                  const dur = word.end - word.start
                                  progress = dur > 0 ? Math.min(1, (time - word.start) / dur) : 1
                                }

                                return (
                                  <span key={wi} className="relative inline-block">
                                    <span
                                      className={`
                                        transition-colors duration-100
                                        ${isCurrent ? 'text-[rgb(var(--text-muted))]/30' : ''}
                                      `}
                                    >
                                      {word.text}
                                    </span>
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
                            l.text
                          )}
                        </div>
                        {l.translation && (
                          <div
                            className={`
                            text-xs lg:text-sm mt-1 transition-all duration-300
                            ${
                              isCurrent
                                ? 'text-[rgb(var(--text-muted))]/60'
                                : 'text-[rgb(var(--text-muted))]/30'
                            }
                          `}
                          >
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
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[rgb(var(--primary))] rounded-full shadow-sm"
                  style={{ left: `calc(${progressPct}% - 6px)` }}
                />
              </div>
              <span className="w-10 tabular-nums">{fmt(duration)}</span>
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-between relative">
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
                    {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow">
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

              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow">
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
    </div>
  )
}

function MusicSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden animate-pulse">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
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

        <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-4 lg:py-6 lg:border-l border-[rgb(var(--border))] min-h-0">
          <div className="w-48 h-48 sm:w-52 sm:h-52 lg:w-56 lg:h-56 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] mb-4" />
          <div className="h-6 w-48 rounded bg-[rgb(var(--card))] mb-1" />
          <div className="h-4 w-24 rounded bg-[rgb(var(--card))] mb-2" />
          <div className="w-full max-w-2xl flex-1 px-6 space-y-2 py-2">
            {[60, 35, 50, 40, 55].map((w, i) => (
              <div key={i} className="flex justify-center">
                <div className="h-4 rounded bg-[rgb(var(--card))]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-[rgb(var(--bg))]/90 backdrop-blur-sm border-t border-[rgb(var(--border))]">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-10 rounded bg-[rgb(var(--card))]" />
          <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--border))]" />
          <div className="h-3 w-10 rounded bg-[rgb(var(--card))]" />
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[rgb(var(--card))]" />
          <div className="h-12 w-12 rounded-full bg-[rgb(var(--card))]" />
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
