import { NextRequest, NextResponse } from 'next/server'

/**
 * BFF 侧（Next Route Handler）的鉴权工具。
 *
 * 长期登录在 Web 上把 refresh token 放进 **HttpOnly Cookie**：JS 读不到，
 * 只有 `/next-api/auth/*` 这些同源路由能取用；access token 仍然由前端持有（内存 + localStorage）。
 */

export const RT_COOKIE = 'hp_rt'
export const RT_MAX_AGE = 90 * 24 * 3600

/** 后端地址：优先内网直连 8090（无 /api 前缀），否则走公网 /api */
export function apiBase(): string {
  const internal = process.env.API_INTERNAL_BASE_URL?.trim()
  if (internal) return internal.replace(/\/$/, '')
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hanphone.cn/api').replace(/\/$/, '')
}

/** 把真实客户端 IP / UA 透传给后端（会话列表要显示 IP 和浏览器） */
export function clientMeta(req: NextRequest) {
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  return { ip, ua: req.headers.get('user-agent') || '' }
}

export function forwardHeaders(req: NextRequest, extra: Record<string, string> = {}): Record<string, string> {
  const { ip, ua } = clientMeta(req)
  const headers: Record<string, string> = { 'content-type': 'application/json', ...extra }
  if (ip) headers['x-real-ip'] = ip
  if (ua) headers['user-agent'] = ua
  return headers
}

export function setRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set(RT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/next-api/auth',
    maxAge: RT_MAX_AGE,
  })
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(RT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/next-api/auth',
    maxAge: 0,
  })
}

/** 从请求里取 access token（前端用 Authorization: Bearer） */
export function bearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim()
}
