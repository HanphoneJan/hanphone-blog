import { NextRequest, NextResponse } from 'next/server'
import { apiBase, bearer, clearRefreshCookie, forwardHeaders, RT_COOKIE } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/** 退出登录：吊销会话 + 清 Cookie（即使后端失败，本地 Cookie 也要清掉） */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(RT_COOKIE)?.value || null
  const token = bearer(request)

  try {
    await fetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: forwardHeaders(request, token ? { authorization: `Bearer ${token}` } : {}),
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      cache: 'no-store',
    })
  } catch {
    // 忽略：本地仍然要清 Cookie
  }

  const res = NextResponse.json({ flag: true, message: '已退出登录' })
  clearRefreshCookie(res)
  return res
}
