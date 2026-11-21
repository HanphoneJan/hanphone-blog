import { STORAGE_KEYS } from '@/lib/constants'

/**
 * 长期登录（Web）。
 *
 * 登录 / 刷新 / 登出都走同源 `/next-api/auth/*`（BFF）：refresh token 放在 HttpOnly Cookie 里，
 * JS 读不到；前端只持有 access token。
 */

function writeToken(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  if (value === null) window.localStorage.removeItem(key)
  else window.localStorage.setItem(key, JSON.stringify(value))
}

export function clearLocalAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEYS.TOKEN)
  window.localStorage.removeItem(STORAGE_KEYS.USER_INFO)
  window.localStorage.removeItem(STORAGE_KEYS.EXPIRE)
}

function saveAccess(token: string, expire?: unknown) {
  writeToken(STORAGE_KEYS.TOKEN, token)
  if (expire !== undefined && expire !== null) {
    writeToken(STORAGE_KEYS.EXPIRE, String(expire))
  }
}

/** 登录（返回后端原始 Result 结构，refresh 由 BFF 写进 Cookie） */
export async function authLogin(body: object) {
  const res = await fetch('/next-api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function authRegister(body: object) {
  const res = await fetch('/next-api/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return res.json()
}

/** OAuth 回调：用 access 换会话（BFF 把 refresh 写进 Cookie） */
export async function adoptSession(
  accessToken: string
): Promise<{ token: string; expire?: string } | null> {
  try {
    const res = await fetch('/next-api/auth/adopt/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (data?.flag && data?.data?.token) {
      saveAccess(data.data.token, data.data.expire)
      return { token: data.data.token, expire: data.data.expire }
    }
  } catch {
    // 忽略：OAuth 的 access 仍然可用，只是没有长期会话
  }
  return null
}

export async function authLogout(accessToken?: string | null) {
  try {
    await fetch('/next-api/auth/logout/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
  } catch {
    // 本地清理无论如何都要做
  }
  clearLocalAuth()
}

// ---------------------------------------------------------------- 刷新

let inflight: Promise<string | null> | null = null

/**
 * 刷新 access：**单飞**，并发调用共享同一次请求，避免刷新风暴与轮换打架。
 * 成功返回新的 access token；失败返回 null（并清空本地登录态）。
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = null
    })
  }
  return inflight
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/next-api/auth/refresh/', {
      method: 'POST',
      credentials: 'same-origin',
    })
    if (!res.ok) {
      clearLocalAuth()
      return null
    }
    const data = await res.json()
    if (data?.flag && data?.data?.token) {
      saveAccess(data.data.token, data.data.expire)
      return data.data.token as string
    }
    clearLocalAuth()
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- 会话管理

export interface UserSessionInfo {
  sid: string
  deviceName?: string | null
  userAgent?: string | null
  ip?: string | null
  createdAt?: string
  lastUsedAt?: string
  expiresAt?: string
  active?: boolean
  revoked?: boolean
  current?: boolean
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function fetchSessions(token: string): Promise<UserSessionInfo[]> {
  const res = await fetch('/next-api/auth/sessions/', { headers: authHeaders(token), cache: 'no-store' })
  const data = await res.json()
  return (data?.data || []) as UserSessionInfo[]
}

export async function revokeSession(token: string, sid: string): Promise<boolean> {
  const res = await fetch(`/next-api/auth/sessions/${encodeURIComponent(sid)}/`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json()
  return Boolean(data?.flag)
}
