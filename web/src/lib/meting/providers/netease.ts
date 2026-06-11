/**
 * 网易云音乐平台提供者
 * 移植自 Meting (https://github.com/metowolf/Meting)
 */

import crypto from 'crypto'
import BaseProvider from './base'
import type { ApiConfig, FormattedSong } from './base'

const EAPI_KEY = 'e82ckenh8dichen8'

export default class NeteaseProvider extends BaseProvider {
  name = 'netease'

  getHeaders(): Record<string, string> {
    const deviceId = this.generateDeviceId()
    return {
      Referer: 'music.163.com',
      Cookie: `osver=android; appver=8.7.01; os=android; deviceId=${deviceId}; channel=netease; requestId=${Date.now()}_${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}; __remember_me=true`,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36 NeteaseMusic/8.7.01',
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }

  search(keyword: string, option: Record<string, unknown> = {}): ApiConfig {
    return {
      method: 'POST',
      url: 'http://music.163.com/api/cloudsearch/pc',
      body: {
        s: keyword,
        type: (option.type as number) || 1,
        limit: (option.limit as number) || 30,
        total: 'true',
        offset: option.page && option.limit ? ((option.page as number) - 1) * (option.limit as number) : 0,
      },
      encode: 'netease_eapi',
      format: 'result.songs',
    }
  }

  song(id: string): ApiConfig {
    return {
      method: 'POST',
      url: 'http://music.163.com/api/v3/song/detail/',
      body: { c: `[{"id":${id},"v":0}]` },
      encode: 'netease_eapi',
      format: 'songs',
    }
  }

  album(id: string): ApiConfig {
    return {
      method: 'POST',
      url: `http://music.163.com/api/v1/album/${id}`,
      body: { total: 'true', offset: '0', id, limit: '1000', ext: 'true', private_cloud: 'true' },
      encode: 'netease_eapi',
      format: 'songs',
    }
  }

  artist(id: string, limit = 50): ApiConfig {
    return {
      method: 'POST',
      url: `http://music.163.com/api/v1/artist/${id}`,
      body: { ext: 'true', private_cloud: 'true', top: limit, id },
      encode: 'netease_eapi',
      format: 'hotSongs',
    }
  }

  playlist(id: string): ApiConfig {
    return {
      method: 'POST',
      url: 'http://music.163.com/api/v6/playlist/detail',
      body: { s: '0', id, n: '1000', t: '0' },
      encode: 'netease_eapi',
      format: 'playlist.tracks',
    }
  }

  url(id: string, br = 320): ApiConfig {
    return {
      method: 'POST',
      url: 'http://music.163.com/api/song/enhance/player/url',
      body: { ids: [id], br: br * 1000 },
      encode: 'netease_eapi',
      decode: 'netease_url',
    }
  }

  lyric(id: string): ApiConfig {
    return {
      method: 'POST',
      url: 'http://music.163.com/api/song/lyric',
      body: { id, os: 'linux', lv: -1, kv: -1, tv: -1 },
      encode: 'netease_eapi',
      decode: 'netease_lyric',
    }
  }

  pic(id: string, size = 300): string {
    const url = `https://p3.music.126.net/${this.encryptId(id)}/${id}.jpg?param=${size}y${size}`
    return JSON.stringify({ url })
  }

  format(data: any): FormattedSong {
    const result: FormattedSong = {
      id: String(data.id),
      name: data.name,
      artist: [],
      album: data.al?.name || '',
      pic_id: String(data.al?.pic_str || data.al?.pic || data.id),
      url_id: String(data.id),
      lyric_id: String(data.id),
      source: 'netease',
    }
    if (data.al?.picUrl) {
      const m = data.al.picUrl.match(/\/(\d+)\./)
      if (m) result.pic_id = m[1]
    }
    if (data.ar) {
      data.ar.forEach((a: any) => result.artist.push(a.name))
    }
    return result
  }

  // ---- EAPI 加密 ----

  async handleEncode(api: ApiConfig): Promise<ApiConfig> {
    if (api.encode === 'netease_eapi') {
      return this.eapiEncrypt(api)
    }
    return api
  }

  async eapiEncrypt(api: ApiConfig): Promise<ApiConfig> {
    const text = JSON.stringify(api.body)
    const url = api.url.replace(/https?:\/\/[^/]+/, '')
    const message = `nobody${url}use${text}md5forencrypt`
    const digest = crypto.createHash('md5').update(message).digest('hex')
    const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`

    const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(EAPI_KEY, 'utf8'), null as any)
    cipher.setAutoPadding(true)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      ...api,
      url: api.url.replace('/api/', '/eapi/'),
      body: { params: encrypted.toUpperCase() },
    }
  }

  // ---- 解码 ----

  urlDecode(result: string): string {
    const data = JSON.parse(result)
    let url = ''
    let size = 0
    let br = -1
    if (data.data?.[0]) {
      const d = data.data[0]
      if (d.uf?.url) d.url = d.uf.url
      if (d.url) {
        url = d.url
        size = d.size || 0
        br = (d.br || 0) / 1000
      }
    }
    return JSON.stringify({ url, size, br })
  }

  lyricDecode(result: string): string {
    const data = JSON.parse(result)
    return JSON.stringify({
      lyric: (data.lrc?.lyric) || '',
      tlyric: (data.tlyric?.lyric) || '',
    })
  }

  // ---- 工具方法 ----

  private generateDeviceId(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase()
  }

  private encryptId(id: string): string {
    const magic = '3go8&$8*3*3h0k(2)2'
    const songId = String(id)
    const encoded = songId.split('').map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ magic.charCodeAt(i % magic.length))
    )
    return crypto.createHash('md5')
      .update(encoded.join(''), 'binary')
      .digest('base64')
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
  }
}
