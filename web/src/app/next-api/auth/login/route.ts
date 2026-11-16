import { NextRequest, NextResponse } from 'next/server'
import { apiBase, forwardHeaders, setRefreshCookie } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/**
 * 登录（BFF）：
 * 后端返回的 refreshToken 直接塞进 HttpOnly Cookie，前端只拿到 access token。
 * 请求体沿用后端契约：{ username, password(md5) }
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ flag: false, message: '请求格式错误' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${apiBase()}/login`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await upstream.json()
    const res = NextResponse.json(
      {
        flag: data.flag,
        code: data.code,
        message: data.message,
        data: data.data
          ? { user: data.data.user, token: data.data.token, expire: data.data.expire }
          : null,
      },
      { status: 200 }
    )
    if (data?.flag && data?.data?.refreshToken) {
      setRefreshCookie(res, data.data.refreshToken)
    }
    return res
  } catch (error) {
    return NextResponse.json({ flag: false, message: '登录服务暂不可用' }, { status: 502 })
  }
}
