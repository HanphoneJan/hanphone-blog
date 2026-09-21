import { describe, it, expect } from 'vitest'
import { toZhCountry, COUNTRY_ZH } from '@/lib/countryZh'

describe('toZhCountry', () => {
  it('映射常见国家为中文', () => {
    expect(toZhCountry('China')).toBe('中国')
    expect(toZhCountry('United States')).toBe('美国')
    expect(toZhCountry('Japan')).toBe('日本')
  })

  it('未收录的国家名回退英文原值', () => {
    expect(toZhCountry('Atlantis')).toBe('Atlantis')
  })

  it('空值返回空', () => {
    expect(toZhCountry(null)).toBe('')
    expect(toZhCountry(undefined)).toBe('')
  })

  it('world.json 主要国家均有映射', () => {
    // 从真实 world.json 取几个关键国家校验映射表覆盖
    expect(COUNTRY_ZH['China']).toBeDefined()
    expect(COUNTRY_ZH['Korea']).toBeDefined()
    expect(COUNTRY_ZH['Taiwan']).toBeDefined()
    expect(COUNTRY_ZH['W. Sahara']).toBeDefined()
  })
})