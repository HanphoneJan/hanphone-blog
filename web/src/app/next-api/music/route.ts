import { NextRequest, NextResponse } from 'next/server'
import Meting, { type FormattedSong } from '@/lib/meting/meting'
import { loadEncryptedCookie, decryptCookie } from '@/lib/netease-cookie/crypto'

const COOKIE_KEY = process.env.NETEASE_COOKIE_KEY

const ALLOWED_TYPES = new Set(['playlist', 'pic', 'lrc', 'song'])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const server = searchParams.get('server') || 'netease'
  const id = searchParams.get('id')

  if (!type || !id) {
    return NextResponse.json({ error: '缺少 type 或 id 参数' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: '不支持的 type: ' + type }, { status: 400 })
  }
  if (server !== 'netease') {
    return NextResponse.json({ error: '当前仅支持网易云音乐' }, { status: 400 })
  }
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'id 必须为数字' }, { status: 400 })
  }

  try {
    const meting = new Meting('netease')
    meting.format(true)
    if (COOKIE_KEY) {
      const payload = loadEncryptedCookie()
      if (payload) {
        try {
          const decryptedCookie = decryptCookie(payload, COOKIE_KEY)
          if (decryptedCookie) meting.cookie(decryptedCookie)
        } catch {
          console.error('Cookie 解密失败，可能密钥已更换')
        }
      }
    }

    // -- 播放列表 --
    if (type === 'playlist') {
      const raw = await meting.playlist(id)
      if (meting.error) {
        return NextResponse.json({ error: meting.status || '请求失败' }, { status: 500 })
      }
      const tracks: FormattedSong[] = JSON.parse(raw)
      return NextResponse.json(tracks.map(t => ({
        title: t.name,
        author: t.artist.join('/'),
        url: '',
        pic: t.pic_id.replace(/^http:/, 'https:'),
        lrc: '',
        id: t.id,
      })))
    }

    // -- 歌曲 URL --
    if (type === 'song') {
      const raw = await meting.url(id)
      if (meting.error) {
        return NextResponse.json({ error: meting.status || '请求失败' }, { status: 500 })
      }
      const data = JSON.parse(raw)
      if (data.url) data.url = data.url.replace(/^http:/, 'https:')
      return NextResponse.json(data)
    }

    // -- 歌词 --
    if (type === 'lrc') {
      const raw = await meting.lyric(id)
      if (meting.error) {
        return NextResponse.json({ error: meting.status || '请求失败' }, { status: 500 })
      }
      const data = JSON.parse(raw)
      // 返回与旧格式兼容的 LRC 文本
      return new NextResponse(data.lyric || '', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // -- 封面图片 --
    if (type === 'pic') {
      const raw = await meting.pic(id)
      const { url } = JSON.parse(raw)
      if (!url) {
        return NextResponse.json({ error: '封面获取失败' }, { status: 500 })
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const imgRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }
      return NextResponse.json({ error: '封面获取失败' }, { status: 500 })
    }

    return NextResponse.json({ error: '未知类型' }, { status: 400 })
  } catch (error) {
    console.error('Music API 错误:', error)
    return NextResponse.json({ error: '音乐服务错误' }, { status: 500 })
  }
}
