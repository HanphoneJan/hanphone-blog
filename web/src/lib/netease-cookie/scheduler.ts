import fs from 'fs'
import path from 'path'
import {
  refreshNeteaseCookieAndAlert,
  shouldRefreshCookie,
} from './refresh'
import { loadEncryptedCookie } from './crypto'

// 冷却期：1 分钟，防止并发时重复刷新
const COOLDOWN_MS = 60 * 1000

const DATA_DIR = path.join(process.cwd(), 'data')
const LOG_FILE = path.join(DATA_DIR, 'netease-cookie-refresh.log')
const MAX_LOG_LINES = 1000

interface RefreshLog {
  timestamp: string
  success: boolean
  refreshed?: boolean
  error?: string
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })
  }
}

export function writeRefreshLog(log: RefreshLog) {
  try {
    ensureDataDir()
    const entry = JSON.stringify(log) + '\n'
    fs.appendFileSync(LOG_FILE, entry, { mode: 0o600 })
    
    // 清理旧日志：保持最多 1000 行
    cleanupOldLogs()
  } catch (err) {
    console.error('[NeteaseCookieScheduler] 写入日志失败:', err)
  }
}

function cleanupOldLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) return
    
    const stats = fs.statSync(LOG_FILE)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    // 如果文件超过一周，或行数超过 1000 行，进行清理
    if (stats.mtimeMs < oneWeekAgo || stats.size > 1024 * 1024) {
      const raw = fs.readFileSync(LOG_FILE, 'utf8')
      const lines = raw.trim().split('\n').filter(Boolean)
      
      if (lines.length > MAX_LOG_LINES) {
        // 保留最后 1000 行
        const keepLines = lines.slice(-MAX_LOG_LINES)
        fs.writeFileSync(LOG_FILE, keepLines.join('\n') + '\n', { mode: 0o600 })
      }
    }
  } catch (err) {
    console.error('[NeteaseCookieScheduler] 清理日志失败:', err)
  }
}

export function readLastRefreshLog(): RefreshLog | null {
  try {
    if (!fs.existsSync(LOG_FILE)) return null
    const raw = fs.readFileSync(LOG_FILE, 'utf8')
    const lines = raw.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return null
    return JSON.parse(lines[lines.length - 1]) as RefreshLog
  } catch {
    return null
  }
}

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
