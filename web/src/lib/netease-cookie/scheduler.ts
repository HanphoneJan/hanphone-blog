import fs from 'fs'
import path from 'path'
import {
  refreshNeteaseCookieAndAlert,
  shouldRefreshCookie,
} from './refresh'
import { loadEncryptedCookie } from './crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOCK_FILE = path.join(DATA_DIR, 'netease-cookie-scheduler.lock')
// 锁有效期：如果持有进程 30 分钟内没有续约，视为已死，其他进程可抢占
const LOCK_TTL_MS = 30 * 60 * 1000

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })
  }
}

function readLock(): { pid: number; updatedAt: string } | null {
  try {
    const raw = fs.readFileSync(LOCK_FILE, 'utf8')
    return JSON.parse(raw) as { pid: number; updatedAt: string }
  } catch {
    return null
  }
}

function isLockValid(lock: { updatedAt: string }): boolean {
  const updated = new Date(lock.updatedAt).getTime()
  return Date.now() - updated < LOCK_TTL_MS
}

/**
 * 尝试原子性地获取调度器锁。
 * 使用 wx 标志：如果锁文件已存在则创建失败，避免多实例并发抢占。
 */
function tryAcquireLock(): boolean {
  ensureDataDir()
  const existing = readLock()
  if (existing && isLockValid(existing)) {
    return false
  }

  try {
    const payload = JSON.stringify({
      pid: process.pid,
      updatedAt: new Date().toISOString(),
    })
    fs.writeFileSync(LOCK_FILE, payload, { flag: 'wx', mode: 0o600 })
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      // 锁被其他进程在并发时抢到了
      return false
    }
    console.error('[NeteaseCookieScheduler] 获取锁失败:', err)
    return false
  }
}

function renewLock() {
  try {
    const payload = JSON.stringify({
      pid: process.pid,
      updatedAt: new Date().toISOString(),
    })
    fs.writeFileSync(LOCK_FILE, payload, { mode: 0o600 })
  } catch (err) {
    console.error('[NeteaseCookieScheduler] 续约锁失败:', err)
  }
}

/**
 * 执行一次 Cookie 刷新检查。
 * 由外部定时任务（如 cron）调用，通过文件锁保证多实例下只有一个执行。
 *
 * @returns 刷新结果，包含是否成功、是否实际刷新、错误信息等
 */
export async function runCookieRefreshTick(): Promise<{
  success: boolean
  refreshed?: boolean
  skipped?: boolean
  error?: string
}> {
  if (!tryAcquireLock()) {
    return { success: true, skipped: true, error: '另一个实例正在执行刷新' }
  }

  try {
    const payload = loadEncryptedCookie()
    if (!payload) {
      return { success: true, skipped: true, error: '未配置 Cookie，无需刷新' }
    }

    if (!shouldRefreshCookie(payload.updatedAt)) {
      return { success: true, skipped: true, error: 'Cookie 尚未到期，无需刷新' }
    }

    const result = await refreshNeteaseCookieAndAlert()
    if (!result.success) {
      console.error('[NeteaseCookieScheduler] 自动刷新失败:', result.error)
      return { success: false, error: result.error }
    }

    if (result.refreshed) {
      console.log('[NeteaseCookieScheduler] 自动刷新成功:', result.updatedAt)
    }

    renewLock()
    return { success: true, refreshed: result.refreshed }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[NeteaseCookieScheduler] tick 异常:', err)
    return { success: false, error: message }
  }
}
