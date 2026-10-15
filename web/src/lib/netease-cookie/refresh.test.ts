import { describe, expect, it } from 'vitest'
import { buildRefreshCookieHeader } from './refresh'

describe('buildRefreshCookieHeader', () => {
  const deviceCookie =
    'osver=android; appver=8.7.01; os=android; deviceId=ABC123; channel=netease; requestId=1_0001; __remember_me=true'

  // 回归：/eapi/login/token/refresh 要求 Cookie 头同时带设备信息与 MUSIC_U，
  // 缺少设备信息（直接覆盖成全量浏览器 Cookie）会返回 code:301。
  it('把 MUSIC_U 追加到设备信息 Cookie 之后', () => {
    expect(buildRefreshCookieHeader(deviceCookie, 'TOKEN_VALUE')).toBe(
      `${deviceCookie}; MUSIC_U=TOKEN_VALUE`,
    )
  })

  it('没有 MUSIC_U 时退回设备信息 Cookie', () => {
    expect(buildRefreshCookieHeader(deviceCookie, undefined)).toBe(deviceCookie)
  })
})
