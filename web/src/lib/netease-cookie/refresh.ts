import Meting from '@/lib/meting/meting'
import NeteaseProvider from '@/lib/meting/providers/netease'
import {
  decryptCookie,
  encryptCookie,
  loadEncryptedCookie,
  saveEncryptedCookie,
} from './crypto'

import { sendRefreshFailureAlert } from './alert'
import { writeRefreshLog } from './scheduler'

const COOKIE_KEY = process.env.NETEASE_COOKIE_KEY

export interface RefreshResult {
  success: boolean
  updatedAt?: string
  newCookiePlain?: string
  error?: string
  refreshed: boolean
}

/**
 * 将刷新接口返回的 Set-Cookie 合并到现有 Cookie 中。
 * 仅更新同名 Cookie，保留其他字段（如 MUSIC_U、__csrf 等）。
 */
function mergeCookies(existingCookie: string, setCookie: string[] | undefined): string {
  const map = new Map<string, string>()

  existingCookie.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx > 0) {
      map.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim())
    }
  })

  if (setCookie) {
    setCookie.forEach(c => {
      const nv = c.split(';')[0]
      const idx = nv.indexOf('=')
      if (idx > 0) {
        map.set(nv.slice(0, idx).trim(), nv.slice(idx + 1).trim())
      }
    })
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

/**
 * 尝试刷新网易云登录 Cookie。
 *
 * 说明：
 * - 仅对“密码登录（手机号/邮箱）”获取的 Cookie 有效
 * - 二维码登录的 Cookie 无法通过 /login/token/refresh 刷新
 * - 刷新成功后会直接写回 netease-cookie.enc
 */
export async function refreshNeteaseCookie(): Promise<RefreshResult> {
  if (!COOKIE_KEY) {
    return { success: false, error: '未配置 NETEASE_COOKIE_KEY', refreshed: false }
  }

  const payload = loadEncryptedCookie()
  if (!payload) {
    return { success: true, refreshed: false } // 没有配置 Cookie，不需要刷新
  }

  let currentCookie: string
  try {
    currentCookie = decryptCookie(payload, COOKIE_KEY)
  } catch {
    return { success: false, error: 'Cookie 解密失败，密钥可能已更换', refreshed: false }
  }

  if (!currentCookie.includes('MUSIC_U')) {
    return {
      success: false,
      error: '当前 Cookie 未包含 MUSIC_U，无法刷新（可能是游客或二维码登录）',
      refreshed: false,
    }
  }

  try {
    const meting = new Meting('netease')
    meting.format(false)
    meting.cookie(currentCookie)

    const provider = meting.provider as NeteaseProvider
    const api = provider.refreshLogin()

    // executeRequest 内部会处理 eapi 加密并调用 curl；curl 已在 info 中保存 set-cookie
    const raw = await provider.executeRequest(api, meting)
    const body = JSON.parse(raw)

    if (body.code !== 200) {
      return {
        success: false,
        error: `刷新接口返回异常: ${body.code} ${body.message || ''}`,
        refreshed: false,
      }
    }

    const setCookie = meting.info?.setCookie || []
    const newCookieString = mergeCookies(currentCookie, setCookie)

    if (newCookieString === currentCookie) {
      // 刷新接口没有更新字段，但仍把更新时间记为现在，
      // 这样手动刷新或调度器触发后页面能显示最新的刷新时间
      const newPayload = encryptCookie(currentCookie, COOKIE_KEY)
      saveEncryptedCookie(newPayload)
      return {
        success: true,
        updatedAt: newPayload.updatedAt,
        newCookiePlain: currentCookie,
        refreshed: false,
      }
    }

    const newPayload = encryptCookie(newCookieString, COOKIE_KEY)
    saveEncryptedCookie(newPayload)

    return {
      success: true,
      updatedAt: newPayload.updatedAt,
      newCookiePlain: newCookieString,
      refreshed: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `刷新失败: ${message}`, refreshed: false }
  }
}

/**
 * 尝试刷新，并在失败时发送管理员告警邮件。
 * cron 端点和后台手动刷新都应使用此函数。
 */
export async function refreshNeteaseCookieAndAlert(): Promise<RefreshResult> {
  const result = await refreshNeteaseCookie()
  if (!result.success) {
    await sendRefreshFailureAlert(result.error || '未知错误')
    writeRefreshLog({
      timestamp: new Date().toISOString(),
      success: false,
      error: result.error,
    })
  } else {
    writeRefreshLog({
      timestamp: new Date().toISOString(),
      success: true,
      refreshed: result.refreshed,
    })
  }
  return result
}

/** 计算距离上次刷新过去了多少小时 */
export function hoursSinceLastRefresh(updatedAt?: string): number | null {
  if (!updatedAt) return null
  const last = new Date(updatedAt).getTime()
  if (Number.isNaN(last)) return null
  return (Date.now() - last) / 1000 / 60 / 60
}

/**
 * 判断是否应该刷新 Cookie。
 * 采用 12~24 小时随机阈值，避免固定频率触发风控。
 * 
 * 注意：此函数使用 Math.random()，每次调用结果不同。
 * 外部 cron 任务每 12 小时调用一次时，有 50% 概率触发刷新；
 * 超过 24 小时则必定触发。
 */
export function shouldRefreshCookie(updatedAt?: string): boolean {
  const hours = hoursSinceLastRefresh(updatedAt)
  if (hours === null) return false
  if (hours >= 24) return true
  if (hours < 12) return false
  const threshold = 12 + Math.random() * 12
  return hours >= threshold
}
