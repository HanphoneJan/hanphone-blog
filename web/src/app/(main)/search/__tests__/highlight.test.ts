import { describe, expect, it } from 'vitest'
import { splitByKeyword } from '../SearchClient'

describe('splitByKeyword', () => {
  it('忽略大小写切分命中段', () => {
    const parts = splitByKeyword('Hello World, hello again', 'hello')
    expect(parts).toEqual([
      { text: 'Hello', match: true },
      { text: ' World, ', match: false },
      { text: 'hello', match: true },
      { text: ' again', match: false },
    ])
  })

  it('空格分隔的多个关键词都高亮，同一位置优先长词', () => {
    const parts = splitByKeyword('搜索优化与搜索页', '搜索 搜索页')
    expect(parts.filter(p => p.match).map(p => p.text)).toEqual(['搜索', '搜索页'])
    expect(splitByKeyword('搜索页', '搜索 搜索页')).toEqual([{ text: '搜索页', match: true }])
  })

  it('正则特殊字符按字面量处理', () => {
    const parts = splitByKeyword('a.b*c', '.*')
    expect(parts).toEqual([{ text: 'a.b*c', match: false }])
  })

  it('空关键词或空文本原样返回', () => {
    expect(splitByKeyword('文本', '   ')).toEqual([{ text: '文本', match: false }])
    expect(splitByKeyword('', '文本')).toEqual([])
  })

  it('只做切分，不改写文本（HTML 保持原样字符串）', () => {
    const input = '<script>alert(1)</script>'
    const parts = splitByKeyword(input, 'script')
    expect(parts.map(p => p.text).join('')).toBe(input)
    expect(parts.filter(p => p.match).map(p => p.text)).toEqual(['script', 'script'])
  })
})
