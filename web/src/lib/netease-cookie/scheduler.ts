import {
  refreshNeteaseCookieAndAlert,
  shouldRefreshCookie,
} from './refresh'
import { loadEncryptedCookie } from './crypto'

// 冷却期：1 分钟，防止并发时重复刷新
const COOLDOWN_MS = 60 * 1000

function isInCooldown(updatedAt: string): boolean {
  const lastRun = new Date(updatedAt).getTime()
  return Date.now() - lastRun < COOLDOWN_MS
}

/**
 * 执行一次 Cookie 刷新检查。
 * 由外部定时任务（如 cron）调用。
 *
 * 并发控制：
 * - 使用 shouldRefreshCookie() 的 12-24 小时随机阈值判断是否需要刷新
 * - 增加 1 分钟冷却期，防止并发时重复刷新
 */
export async function runCookieRefreshTick(): Promise<{
  success: boolean
  refreshed?: boolean
  skipped?: boolean
  error?: string
}> {
  const payload = loadEncryptedCookie()
  if (!payload) {
    return { success: true, skipped: true, error: '未配置 Cookie，无需刷新' }
  }

  if (!shouldRefreshCookie(payload.updatedAt)) {
    return { success: true, skipped: true, error: 'Cookie 尚未到期，无需刷新' }
  }

  // 冷却期检查：防止并发时重复刷新
  if (isInCooldown(payload.updatedAt)) {
    return { success: true, skipped: true, error: '刷新过于频繁，请稍后再试' }
  }

  try {
    const result = await refreshNeteaseCookieAndAlert()
    if (!result.success) {
      console.error('[NeteaseCookieScheduler] 自动刷新失败:', result.error)
      return { success: false, error: result.error }
    }

    if (result.refreshed) {
      console.log('[NeteaseCookieScheduler] 自动刷新成功:', result.updatedAt)
    }

    return { success: true, refreshed: result.refreshed }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[NeteaseCookieScheduler] tick 异常:', err)
    return { success: false, error: message }
  }
}
