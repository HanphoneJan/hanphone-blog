'use server'

// 位置信息类型
interface LocationInfo {
  loginProvince: string
  loginCity: string
  loginLat: number
  loginLng: number
}

export async function getLocationInfo(): Promise<LocationInfo> {
  try {
    const key = process.env.LOCATION_KEY
    const baseUrl = process.env.LOCATION_URL
    const url = `${baseUrl}?key=${key}&output=json`

    // 腾讯位置服务的 WebService key 按域名白名单授权，服务端请求默认不带 Referer，
    // 不带会被判为「来源域名未被授权」(status 110)，所以显式带上本站来源。
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hanphone.cn'
    const response = await fetch(url, {
      headers: { Referer: siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/` }
    })
    const data = await response.json()

    // 验证响应状态是否成功
    if (data.status === 0) {
      return {
        loginProvince: data.result.ad_info.province,
        loginCity: data.result.ad_info.city,
        loginLat: data.result.location.lat,
        loginLng: data.result.location.lng
      }
    } else {
      throw new Error(`获取地理位置失败: ${data.message}`)
    }
  } catch (error) {
    console.log('获取地理位置失败:', error)
    // 使用默认位置信息
    return {
      loginProvince: '',
      loginCity: '',
      loginLat: 30.27,
      loginLng: 103.08
    }
  }
}
