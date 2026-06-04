import { describe, it, expect } from 'vitest'

// 简单的工具函数测试示例
describe('工具函数测试', () => {
  describe('字符串处理', () => {
    it('应该正确截断字符串', () => {
      const truncate = (str: string, maxLength: number): string => {
        if (str.length <= maxLength) return str
        return str.slice(0, maxLength) + '...'
      }

      expect(truncate('hello world', 5)).toBe('hello...')
      expect(truncate('hi', 10)).toBe('hi')
      expect(truncate('', 5)).toBe('')
    })

    it('应该正确转换大小写', () => {
      const toCamelCase = (str: string): string => {
        return str
          .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
          .replace(/^(.)/, (_, char) => char.toLowerCase())
      }

      expect(toCamelCase('hello-world')).toBe('helloWorld')
      expect(toCamelCase('hello_world')).toBe('helloWorld')
      expect(toCamelCase('HelloWorld')).toBe('helloWorld')
    })
  })

  describe('数组处理', () => {
    it('应该正确去重数组', () => {
      const unique = <T>(arr: T[]): T[] => [...new Set(arr)]

      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b'])
    })

    it('应该正确分组数组', () => {
      const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
        return arr.reduce((groups, item) => {
          const groupKey = String(item[key])
          return {
            ...groups,
            [groupKey]: [...(groups[groupKey] || []), item],
          }
        }, {} as Record<string, T[]>)
      }

      const data = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ]

      expect(groupBy(data, 'type')).toEqual({
        a: [
          { type: 'a', value: 1 },
          { type: 'a', value: 3 },
        ],
        b: [{ type: 'b', value: 2 }],
      })
    })
  })

  describe('日期处理', () => {
    it('应该正确格式化日期', () => {
      const formatDate = (date: Date, format: string): string => {
        const map: Record<string, string> = {
          YYYY: String(date.getFullYear()),
          MM: String(date.getMonth() + 1).padStart(2, '0'),
          DD: String(date.getDate()).padStart(2, '0'),
        }
        return format.replace(/YYYY|MM|DD/g, match => map[match])
      }

      const date = new Date('2024-03-15')
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-03-15')
      expect(formatDate(date, 'YYYY/MM/DD')).toBe('2024/03/15')
    })

    it('应该正确计算时间差', () => {
      const getTimeDiff = (start: Date, end: Date): number => {
        return Math.floor((end.getTime() - start.getTime()) / 1000)
      }

      const start = new Date('2024-01-01 12:00:00')
      const end = new Date('2024-01-01 12:01:30')
      expect(getTimeDiff(start, end)).toBe(90)
    })
  })

  describe('验证函数', () => {
    it('应该正确验证邮箱格式', () => {
      const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      }

      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })

    it('应该正确验证 URL 格式', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url)
          return true
        } catch {
          return false
        }
      }

      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('')).toBe(false)
    })
  })
})
