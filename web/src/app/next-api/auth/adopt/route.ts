import { NextRequest, NextResponse } from 'next/server'
import { apiBase, bearer, forwardHeaders, setRefreshCookie } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/**
 * OAuth 登录后补建会话。
 *
 * GitHub 回调是「后端 302 带 access token 回前端」，refresh 没法放进 URL（会进历史/日志）。
 * 所以前端拿 access 调这里，由 BFF 换成会话并把 refresh 写进 HttpOnly Cookie。
 */
export async function POST(request: NextRequest) {
  const token = bearer(request) || (request.nextUrl.searchParams.get('token') ?? '')
  if (!token) {
    return NextResponse.json({ flag: false, message: '缺少 access token' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${apiBase()}/auth/adopt`, {
      method: 'POST',
      headers: forwardHeaders(request, { authorization: `Bearer ${token}` }),
      body: JSON.stringify({}),
      cache: 'no-store',
    })
    const data = await upstream.json()
    if (!data?.flag || !data?.data?.refreshToken) {
      return NextResponse.json(
        { flag: false, message: data?.message || '建立会话失败' },
        { status: 401 }
      )
    }
    const res = NextResponse.json({
      flag: true,
      data: { token: data.data.token, expire: data.data.expire },
    })
    setRefreshCookie(res, data.data.refreshToken)
    return res
  } catch {
    return NextResponse.json({ flag: false, message: '服务暂不可用' }, { status: 502 })
  }
}
