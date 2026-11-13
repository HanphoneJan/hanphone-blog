import { describe, expect, it } from 'vitest'
import { isImeComposing } from '../keyboard'

const event = (init: { isComposing?: boolean; keyCode?: number }) => init as KeyboardEvent

describe('isImeComposing', () => {
  it('识别正在组合输入（原生事件）', () => {
    expect(isImeComposing(event({ isComposing: true, keyCode: 13 }))).toBe(true)
  })

  it('识别 Safari 的 keyCode 229', () => {
    expect(isImeComposing(event({ isComposing: false, keyCode: 229 }))).toBe(true)
  })

  it('普通回车不算组合输入', () => {
    expect(isImeComposing(event({ isComposing: false, keyCode: 13 }))).toBe(false)
  })

  it('支持 React 合成事件', () => {
    expect(isImeComposing({ nativeEvent: event({ isComposing: true }) })).toBe(true)
    expect(isImeComposing({ nativeEvent: event({ isComposing: false, keyCode: 13 }) })).toBe(false)
  })
})
