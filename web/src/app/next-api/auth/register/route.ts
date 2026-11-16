import { NextRequest, NextResponse } from 'next/server'
import { apiBase, forwardHeaders, setRefreshCookie } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/** 注册（BFF）：成功后同样把 refresh 放进 HttpOnly Cookie */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ flag: false, message: '请求格式错误' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${apiBase()}/register`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await upstream.json()
    const res = NextResponse.json({
      flag: data.flag,
      code: data.code,
      message: data.message,
      data: data.data
        ? { user: data.data.user, token: data.data.token, expire: data.data.expire }
        : null,
    })
    if (data?.flag && data?.data?.refreshToken) {
      setRefreshCookie(res, data.data.refreshToken)
    }
    return res
  } catch {
    return NextResponse.json({ flag: false, message: '注册服务暂不可用' }, { status: 502 })
  }
}
