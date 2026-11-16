import { NextRequest, NextResponse } from 'next/server'
import { apiBase, bearer, forwardHeaders } from '@/lib/serverAuth'

export const runtime = 'nodejs'

/** 登录设备列表（透传后端的 /auth/sessions） */
export async function GET(request: NextRequest) {
  const token = bearer(request)
  if (!token) {
    return NextResponse.json({ flag: false, message: '缺少登录凭证' }, { status: 401 })
  }
  try {
    const upstream = await fetch(`${apiBase()}/auth/sessions`, {
      headers: forwardHeaders(request, { authorization: `Bearer ${token}` }),
      cache: 'no-store',
    })
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json({ flag: false, message: '服务暂不可用' }, { status: 502 })
  }
}
