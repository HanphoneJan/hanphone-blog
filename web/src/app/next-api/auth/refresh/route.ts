import { NextRequest, NextResponse } from 'next/server'
import { apiBase, forwardHeaders, clearRefreshCookie, RT_COOKIE, setRefreshCookie } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/**
 * 刷新 access（BFF）：
 * 从 HttpOnly Cookie 取 refresh → 调后端轮换 → 把新的 refresh 写回 Cookie。
 * 并发时前端会做单飞（lib/authApi.ts），这里不需要额外锁。
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(RT_COOKIE)?.value
  if (!refreshToken) {
    return NextResponse.json({ flag: false, message: '没有登录会话' }, { status: 401 })
  }

  try {
    const upstream = await fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
    const data = await upstream.json()
    if (!data?.flag || !data?.data?.token) {
      const res = NextResponse.json(
        { flag: false, message: data?.message || '登录状态已过期', data: data?.data ?? null },
        { status: 401 }
      )
      clearRefreshCookie(res)
      return res
    }
    const res = NextResponse.json({
      flag: true,
      message: 'ok',
      data: { token: data.data.token, expire: data.data.expire },
    })
    setRefreshCookie(res, data.data.refreshToken)
    return res
  } catch {
    return NextResponse.json({ flag: false, message: '刷新服务暂不可用' }, { status: 502 })
  }
}
