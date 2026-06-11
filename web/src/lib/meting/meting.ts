/**
 * Meting 音乐框架核心
 * 移植自 https://github.com/metowolf/Meting (MIT License)
 */

import NeteaseProvider from './providers/netease'
import type BaseProvider from './providers/base'
import type { ApiConfig } from './providers/base'

export default class Meting {
  VERSION = '2.0.0'
  raw = ''
  info: { statusCode: number; headers: Record<string, string> } | null = null
  error: string | null = null
  status = ''
  temp: Record<string, unknown> = {}
  server: string
  provider: BaseProvider
  isFormat = false
  header: Record<string, string> = {}

  constructor(server = 'netease') {
    this.server = server
    this.provider = new NeteaseProvider(this)
    this.header = this.provider.getHeaders()
  }

  cookie(cookie: string): this {
    this.header['Cookie'] = cookie
    return this
  }

  format(format = true): this {
    this.isFormat = format
    return this
  }

  async curl(url: string, payload: any = null): Promise<this> {
    const options: RequestInit = {
      method: payload ? 'POST' : 'GET',
      headers: { ...this.header },
    }

    if (payload) {
      if (typeof payload === 'object' && !Buffer.isBuffer(payload)) {
        const sp = new URLSearchParams(payload as Record<string, string>)
        options.body = sp.toString()
        options.headers = { ...options.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
      } else {
        options.body = payload
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    options.signal = controller.signal

    let retries = 3
    while (retries >= 0) {
      try {
        const response = await fetch(url, options)
        clearTimeout(timeoutId)
        this.info = {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        }
        this.raw = await response.text()
        this.error = null
        this.status = ''
        return this
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (retries > 0) {
          retries--
          await new Promise(r => setTimeout(r, 1000))
        } else {
          this.error = err.name === 'AbortError' ? 'TIMEOUT' : (err.code || err.name)
          this.status = err.message
          return this
        }
      }
    }
    return this
  }

  private async exec(api: ApiConfig): Promise<string> {
    return this.provider.executeRequest(api, this)
  }

  async search(keyword: string, option?: Record<string, unknown>): Promise<string> {
    return this.exec(this.provider.search(keyword, option))
  }

  async song(id: string): Promise<string> {
    return this.exec(this.provider.song(id))
  }

  async album(id: string): Promise<string> {
    return this.exec(this.provider.album(id))
  }

  async artist(id: string, limit?: number): Promise<string> {
    return this.exec(this.provider.artist(id, limit))
  }

  async playlist(id: string): Promise<string> {
    return this.exec(this.provider.playlist(id))
  }

  async url(id: string, br?: number): Promise<string> {
    this.temp.br = br
    return this.exec(this.provider.url(id, br))
  }

  async lyric(id: string): Promise<string> {
    return this.exec(this.provider.lyric(id))
  }

  async pic(id: string, size?: number): Promise<string> {
    const result = this.provider.pic(id, size)
    if (result instanceof Promise) return result
    return result
  }
}

export type { FormattedSong } from './providers/base'
