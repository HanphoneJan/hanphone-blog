'use client'

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import emojiMartData from '@emoji-mart/data/sets/12.1/all.json'

interface EmojiPickerProps {
  /** 获取目标 textarea 元素的回调 */
  getTextarea: () => HTMLTextAreaElement | null
  /** 弹窗相对于按钮的位置 */
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  /** 触发按钮的自定义类名 */
  buttonClassName?: string
  /** 触发按钮的自定义内容，默认 😊 */
  buttonContent?: React.ReactNode
}

/** 颜文字数据（合并为一个分类） */
const KAOMOJI_ITEMS = [
  '(｡･ω･｡)', '(＾▽＾)', '(*^_^*)', '(◕‿◕)', '(´▽｀)', '(｀・ω・´)', '(๑•̀ㅂ•́)و✧',
  '(づ￣³￣)づ', '(*^3^)', '( ˘ ³˘)♥', '(｡♥‿♥｡)', '♥(ˆ⌣ˆԅ)',
  '(╥﹏╥)', '(｡•́︿•̀｡)', '(T_T)', '(´；ω；`)', '(つ﹏⊂)', '(｡╯︵╰｡)',
  '(╬ Ò﹏Ó)', '(≧σ≦)', "(ง'̀-'́)ง", '(╯°□°）╯', '(ノಠ益ಠ)ノ', '（｀Δ´）！',
  '(⊙_⊙)', '(°o°;)', '(O_O;)', '（・□・；）', 'Σ(ﾟДﾟ)', '( Ꙭ )',
  '(￣▽￣)', '(¬‿¬)', '(ಠ_ಠ)', '( ͡° ͜ʖ ͡°)', '(´･_･`)', '(；一_一)',
  '(￣o￣) zzZ', '(-_-) zzz', '(¦3[▓▓]', '_(´ཀ`」 ∠)_',
]

/** Emoji 分类配置 */
const EMOJI_CATEGORIES = [
  { id: 'people', name: '人物', icon: '😀', sourceId: 'people' },
  { id: 'kaomoji', name: '颜文字', icon: '(◕‿◕)', items: KAOMOJI_ITEMS },
  { id: 'nature', name: '自然', icon: '🌿', sourceId: 'nature' },
  { id: 'foods', name: '食物', icon: '🍎', sourceId: 'foods' },
  { id: 'activity', name: '活动', icon: '⚽', sourceId: 'activity' },
  { id: 'places', name: '地点', icon: '✈️', sourceId: 'places' },
  { id: 'objects', name: '物品', icon: '💡', sourceId: 'objects' },
  { id: 'symbols', name: '符号', icon: '❤️', sourceId: 'symbols' },
]

/** 构建分类数据 */
const ALL_CATEGORIES = EMOJI_CATEGORIES.map(cat => {
  if (cat.id === 'kaomoji') {
    return { id: cat.id, name: cat.name, icon: cat.icon, items: cat.items }
  }
  const sourceCat = (emojiMartData as any).categories.find((c: any) => c.id === cat.sourceId)
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    items: sourceCat?.emojis
      ?.map((id: string) => (emojiMartData as any).emojis[id]?.skins?.[0]?.native)
      ?.filter((native: string) => native && !native.includes('\u200d')) ?? [],
  }
})

const PICKER_WIDTH = 280
const PICKER_HEIGHT = 230

/** 将字符串插入到 textarea 光标位置 */
export function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const newValue = textarea.value.slice(0, start) + text + textarea.value.slice(end)

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set
  if (nativeSetter) {
    nativeSetter.call(textarea, newValue)
  } else {
    textarea.value = newValue
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))

  requestAnimationFrame(() => {
    const newPos = start + text.length
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

export default function EmojiPicker({
  getTextarea,
  placement = 'bottom-left',
  buttonClassName = '',
  buttonContent = '😊',
}: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [activeCategory, setActiveCategory] = useState('kaomoji')
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const isKaomoji = activeCategory === 'kaomoji'

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top: number
    let left: number

    // 垂直方向：优先按 placement，空间不足则翻转
    if (placement.startsWith('bottom')) {
      if (rect.bottom + PICKER_HEIGHT + 8 <= vh) {
        top = rect.bottom + 8
      } else {
        top = rect.top - PICKER_HEIGHT - 8
      }
    } else {
      if (rect.top - PICKER_HEIGHT - 8 >= 0) {
        top = rect.top - PICKER_HEIGHT - 8
      } else {
        top = rect.bottom + 8
      }
    }

    // 水平方向
    if (placement.endsWith('left')) {
      left = rect.left
      if (left + PICKER_WIDTH > vw - 8) {
        left = vw - PICKER_WIDTH - 8
      }
      if (left < 8) left = 8
    } else {
      left = rect.right - PICKER_WIDTH
      if (left < 8) {
        left = 8
      }
      if (left + PICKER_WIDTH > vw - 8) {
        left = vw - PICKER_WIDTH - 8
      }
    }

    setPickerPos({ top, left })
  }, [placement])

  useLayoutEffect(() => {
    if (showPicker) {
      computePosition()
    }
  }, [showPicker, computePosition])

  useEffect(() => {
    if (!showPicker) return
    const handleResize = () => computePosition()
    const handleScroll = () => computePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showPicker, computePosition])

  useEffect(() => {
    if (!showPicker) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  const handleItemClick = (item: string) => {
    const textarea = getTextarea()
    if (!textarea) return
    insertAtCursor(textarea, item)
    setShowPicker(false)
  }

  const activeItems = ALL_CATEGORIES.find(c => c.id === activeCategory)?.items ?? []

  const pickerContent = (
    <div
      ref={pickerRef}
      className="fixed z-[9999] rounded-lg border shadow-lg overflow-hidden"
      style={{
        top: pickerPos?.top ?? 0,
        left: pickerPos?.left ?? 0,
        width: PICKER_WIDTH,
        background: 'rgb(var(--card))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* 分类标签 */}
      <div
        className="flex gap-0.5 p-1.5 overflow-x-auto"
        style={{ borderBottom: '1px solid rgb(var(--border))' }}
      >
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className="px-1.5 rounded whitespace-nowrap transition-colors flex items-center justify-center"
            style={{
              height: 26,
              minWidth: 26,
              lineHeight: 1,
              background: activeCategory === cat.id ? 'rgb(var(--primary))' : 'transparent',
            }}
            onMouseEnter={e => {
              if (activeCategory !== cat.id) {
                e.currentTarget.style.background = 'rgb(var(--primary) / 0.1)'
              }
            }}
            onMouseLeave={e => {
              if (activeCategory !== cat.id) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span
              style={{
                color: activeCategory === cat.id ? '#fff' : 'rgb(var(--text))',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              {cat.icon}
            </span>
          </button>
        ))}
      </div>
      {/* 内容区 */}
      {isKaomoji ? (
        <div className="flex flex-wrap gap-1 p-2 max-h-[200px] overflow-y-auto">
          {activeItems.map((item: string, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => handleItemClick(item)}
              className="text-sm px-2 py-1 rounded transition-colors"
              style={{ color: 'rgb(var(--text))', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--primary) / 0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              title={item}
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5 p-2 max-h-[200px] overflow-y-auto">
          {activeItems.map((item: string, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => handleItemClick(item)}
              className="text-lg p-1 rounded flex items-center justify-center transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--primary) / 0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              title={item}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`text-sm opacity-50 hover:opacity-100 transition-opacity ${buttonClassName}`}
        title="插入表情"
      >
        {buttonContent}
      </button>
      {showPicker && pickerPos && createPortal(pickerContent, document.body)}
    </>
  )
}
