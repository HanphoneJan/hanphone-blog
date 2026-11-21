import { describe, expect, it } from 'vitest'
import { formatDateTime, formatRelativeTime, parseTime } from '../datetime'

describe('parseTime', () => {
  it('解析 epoch 毫秒数字', () => {
    expect(parseTime(0)?.getTime()).toBe(0)
    expect(parseTime(1_700_000_000_000)?.getTime()).toBe(1_700_000_000_000)
  })

  it('数字字符串也按 epoch 毫秒处理', () => {
    expect(parseTime('0')?.getTime()).toBe(0)
    expect(parseTime(' 1700000000000 ')?.getTime()).toBe(1_700_000_000_000)
  })

  it('解析 ISO 字符串与空格分隔的时间字符串', () => {
    expect(parseTime('2026-11-22T10:00:00')?.getFullYear()).toBe(2026)
    expect(parseTime('2026-11-22 10:00:00')?.getFullYear()).toBe(2026)
  })

  it('空值与非法值返回 null', () => {
    expect(parseTime(null)).toBeNull()
    expect(parseTime(undefined)).toBeNull()
    expect(parseTime('')).toBeNull()
    expect(parseTime('   ')).toBeNull()
    expect(parseTime('not-a-time')).toBeNull()
    expect(parseTime(new Date('invalid'))).toBeNull()
    expect(parseTime(Number.NaN)).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  it('一分钟内显示刚刚', () => {
    expect(formatRelativeTime(Date.now() - 30_000)).toBe('刚刚')
    expect(formatRelativeTime(Date.now() + 60_000)).toBe('刚刚')
  })

  it('按分钟/小时/天递进', () => {
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe('5 分钟前')
    expect(formatRelativeTime(Date.now() - 3 * 60 * 60_000)).toBe('3 小时前')
    expect(formatRelativeTime(Date.now() - 2 * 24 * 60 * 60_000)).toBe('2 天前')
  })

  it('非法输入返回空字符串，不抛异常', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime('bad')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('解析成功时返回本地时间字符串，失败返回空字符串', () => {
    expect(formatDateTime(0)).not.toBe('')
    expect(formatDateTime('bad')).toBe('')
  })
})
