import { API_BASE_URL } from '@/lib/api'
import { STORAGE_KEYS } from '@/lib/constants'

/**
 * 长期登录（Web）。
 *
 * 两种模式：
 * - **BFF（默认，线上）**：登录 / 刷新 / 登出都走同源 `/next-api/auth/*`，refresh token 放在
 *   HttpOnly Cookie 里，JS 读不到；前端只持有 access token。
 * - **直连（Tauri 静态导出）**：没有 Node 路由，直接调后端并把 refresh 存 localStorage。
 *   由构建环境变量 `NEXT_PUBLIC_AUTH_DIRECT=1` 切换。
 */
export const AUTH_DIRECT = process.env.NEXT_PUBLIC_AUTH_DIRECT === '1'

const RT_KEY = STORAGE_KEYS.REFRESH_TOKEN

function readToken(key: string): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

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
  if (AUTH_DIRECT) window.localStorage.removeItem(RT_KEY)
}

function saveAccess(token: string, expire?: unknown) {
  writeToken(STORAGE_KEYS.TOKEN, token)
  if (expire !== undefined && expire !== null) {
    writeToken(STORAGE_KEYS.EXPIRE, String(expire))
  }
}

/** 登录（返回后端原始 Result 结构，refresh 在 BFF 模式下已进 Cookie） */
export async function authLogin(body: object) {
  if (AUTH_DIRECT) {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data?.flag && data?.data?.refreshToken) writeToken(RT_KEY, data.data.refreshToken)
    return data
  }
  const res = await fetch('/next-api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function authRegister(body: object) {
  if (AUTH_DIRECT) {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data?.flag && data?.data?.refreshToken) writeToken(RT_KEY, data.data.refreshToken)
    return data
  }
  const res = await fetch('/next-api/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return res.json()
}

/** OAuth 回调：用 access 换会话（BFF 模式把 refresh 写进 Cookie） */
export async function adoptSession(
  accessToken: string
): Promise<{ token: string; expire?: string } | null> {
  if (AUTH_DIRECT) return null
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
    if (AUTH_DIRECT) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Token: accessToken } : {}),
        },
        body: JSON.stringify({ refreshToken: readToken(RT_KEY) }),
      })
    } else {
      await fetch('/next-api/auth/logout/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
    }
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
    if (AUTH_DIRECT) {
      const refreshToken = readToken(RT_KEY)
      if (!refreshToken) return null
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (data?.flag && data?.data?.token) {
        writeToken(RT_KEY, data.data.refreshToken || refreshToken)
        saveAccess(data.data.token, data.data.expire)
        return data.data.token as string
      }
      clearLocalAuth()
      return null
    }

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
  const url = AUTH_DIRECT ? `${API_BASE_URL}/auth/sessions` : '/next-api/auth/sessions/'
  const res = await fetch(url, { headers: authHeaders(token), cache: 'no-store' })
  const data = await res.json()
  return (data?.data || []) as UserSessionInfo[]
}

export async function revokeSession(token: string, sid: string): Promise<boolean> {
  const url = AUTH_DIRECT
    ? `${API_BASE_URL}/auth/sessions/${encodeURIComponent(sid)}`
    : `/next-api/auth/sessions/${encodeURIComponent(sid)}/`
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders(token) })
  const data = await res.json()
  return Boolean(data?.flag)
}
