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

function randomIntervalMs(): number {
  // 12 ~ 24 小时
  const hours = 12 + Math.random() * 12
  return Math.floor(hours * 60 * 60 * 1000)
}

async function tick() {
  if (!tryAcquireLock()) {
    // 当前实例不是调度器，等下一轮再尝试
    scheduleNext()
    return
  }

  try {
    const payload = loadEncryptedCookie()
    if (!payload) {
      // 没有配置 Cookie，不需要刷新
      scheduleNext()
      return
    }

    if (shouldRefreshCookie(payload.updatedAt)) {
      const result = await refreshNeteaseCookieAndAlert()
      if (!result.success) {
        console.error('[NeteaseCookieScheduler] 自动刷新失败:', result.error)
      } else if (result.refreshed) {
        console.log('[NeteaseCookieScheduler] 自动刷新成功:', result.updatedAt)
      }
    }

    renewLock()
  } catch (err) {
    console.error('[NeteaseCookieScheduler] tick 异常:', err)
  }

  scheduleNext()
}

function scheduleNext(delayMs?: number) {
  const delay = delayMs ?? randomIntervalMs()
  setTimeout(() => {
    tick().catch(err => console.error('[NeteaseCookieScheduler] tick 未捕获异常:', err))
  }, delay)
}

/**
 * 启动进程内 Cookie 刷新调度器。
 *
 * - 只在生产环境服务端启动
 * - 多实例通过文件锁保证只有一个实例实际执行刷新
 * - 刷新间隔 12~24 小时随机
 * - 刷新失败会自动发送管理员告警邮件
 */
export function startCookieRefreshScheduler() {
  // 只在服务端、生产环境、非构建阶段运行
  if (typeof window !== 'undefined') return
  if (process.env.NODE_ENV !== 'production') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (!process.env.NETEASE_COOKIE_KEY) return

  // 第一次：如果 Cookie 已经到期，立即尝试刷新；否则随机等待
  const payload = loadEncryptedCookie()
  const firstDelay =
    payload && shouldRefreshCookie(payload.updatedAt) ? 0 : randomIntervalMs()

  scheduleNext(firstDelay)
  console.log('[NeteaseCookieScheduler] 调度器已启动，首次执行延迟:', firstDelay, 'ms')
}
