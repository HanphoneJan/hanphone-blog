/**
 * 时间格式化工具。
 *
 * 后端的 `Date` 字段默认被 Jackson 序列化成 epoch 毫秒数字（通知、收藏都是如此），
 * 历史接口里也有 ISO 字符串 / "yyyy-MM-dd HH:mm:ss" 两种写法。这里统一走一个安全解析入口：
 * 解析失败返回 null（展示层自行决定空态），不向页面抛异常、不出现 "Invalid Date"。
 */

export type TimeInput = number | string | Date | null | undefined

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 安全解析时间；无法解析时返回 null */
export function parseTime(value: TimeInput): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const fromNumber = new Date(value)
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  // 纯数字字符串按 epoch 毫秒处理（兼容数字被包成字符串的返回）
  if (/^\d+$/.test(trimmed)) {
    const fromDigits = new Date(Number(trimmed))
    return Number.isNaN(fromDigits.getTime()) ? null : fromDigits
  }

  const date = new Date(trimmed)
  if (!Number.isNaN(date.getTime())) return date

  // Safari 不认 "2026-11-22 10:00:00"，把空格换成 T 再试一次
  const retried = new Date(trimmed.replace(' ', 'T'))
  return Number.isNaN(retried.getTime()) ? null : retried
}

/** 绝对时间：2026/11/22 10:00:00 */
export function formatDateTime(value: TimeInput): string {
  const date = parseTime(value)
  if (!date) return ''
  return date.toLocaleString('zh-CN', { hour12: false })
}

/** 相对时间：刚刚 / 3 分钟前 / 2 小时前 / 5 天前 / 2026/11/1（超过 7 天） */
export function formatRelativeTime(value: TimeInput): string {
  const date = parseTime(value)
  if (!date) return ''

  const diff = Date.now() - date.getTime()
  // 未来时间（时钟偏差）按「刚刚」处理，避免出现负数
  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`
  return date.toLocaleDateString('zh-CN')
}
