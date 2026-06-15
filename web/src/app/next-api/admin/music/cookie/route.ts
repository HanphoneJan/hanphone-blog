import { existsSync, unlinkSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/api'
import {
  encryptCookie,
  loadEncryptedCookie,
  saveEncryptedCookie,
  COOKIE_FILE,
} from '@/lib/netease-cookie/crypto'
import {
  hoursSinceLastRefresh,
  refreshNeteaseCookieAndAlert,
  shouldRefreshCookie,
} from '@/lib/netease-cookie/refresh'

export const runtime = 'nodejs'

const COOKIE_KEY = process.env.NETEASE_COOKIE_KEY

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/getBlogCount`, {
      headers: { Token: token },
    })
    return res.ok
  } catch {
    return false
  }
}

function unauthorized() {
  return NextResponse.json({ error: '未授权' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: '无权限' }, { status: 403 })
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('token')
  if (!token) return unauthorized()

  const isAdmin = await verifyAdminToken(token)
  if (!isAdmin) return forbidden()

  const payload = loadEncryptedCookie()
  if (!payload) {
    return NextResponse.json({ configured: false })
  }

  const hours = hoursSinceLastRefresh(payload.updatedAt)

  return NextResponse.json({
    configured: true,
    updatedAt: payload.updatedAt,
    hoursSinceLastRefresh: hours,
    needsRefresh: shouldRefreshCookie(payload.updatedAt),
  })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('token')
  if (!token) return unauthorized()

  const isAdmin = await verifyAdminToken(token)
  if (!isAdmin) return forbidden()

  const result = await refreshNeteaseCookieAndAlert()
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    refreshed: result.refreshed,
    updatedAt: result.updatedAt,
  })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('token')
  if (!token) return unauthorized()

  const isAdmin = await verifyAdminToken(token)
  if (!isAdmin) return forbidden()

  if (!COOKIE_KEY) {
    return NextResponse.json({ error: '未配置 NETEASE_COOKIE_KEY' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const cookie = typeof body.cookie === 'string' ? body.cookie.trim() : ''
    if (!cookie) {
      return NextResponse.json({ error: 'cookie 不能为空' }, { status: 400 })
    }

    const payload = encryptCookie(cookie, COOKIE_KEY)
    saveEncryptedCookie(payload)

    return NextResponse.json({ success: true, updatedAt: payload.updatedAt })
  } catch {
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('token')
  if (!token) return unauthorized()

  const isAdmin = await verifyAdminToken(token)
  if (!isAdmin) return forbidden()

  try {
    if (existsSync(COOKIE_FILE)) {
      unlinkSync(COOKIE_FILE)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '清除失败' }, { status: 500 })
  }
}
