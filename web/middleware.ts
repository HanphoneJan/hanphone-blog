import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 域名架构说明：
 * - 主域名 (PRIMARY_DOMAIN): 博客应用（当前 Next.js 项目，由独立的 Nginx 配置代理）
 * - 文件域名 (FILE_DOMAIN): 文件服务（独立服务，运行在 4000 端口，由独立 Nginx 配置代理）
 *
 * 重定向逻辑说明：
 * - 此 middleware 仅处理到达博客应用的请求
 * - 文件域名的请求由其独立的 Nginx 配置直接代理到文件服务，不会到达此应用
 * - 因此重定向逻辑不会影响文件服务域名的正常工作
 * - 重定向仅在生产环境生效，且排除 localhost 和 127.0.0.1
 */

// 规范化域名配置
const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'hanphone.cn'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // 1. 301重定向：非www域名重定向到www域名
  // 只在生产环境且不是localhost时执行
  // 注意：hanphone.top 的请求不会到达此 middleware，因为由独立 Nginx 配置处理
  if (
    process.env.NODE_ENV === 'production' &&
    hostname !== PRIMARY_DOMAIN &&
    !hostname.startsWith('localhost') &&
    !hostname.startsWith('127.0.0.1')
  ) {
    const newUrl = new URL(url.pathname + url.search, `https://${PRIMARY_DOMAIN}`)
    return NextResponse.redirect(newUrl, 301)
  }

  // 2. 从Cookie获取主题设置（服务器端可访问）
  const themeCookie = request.cookies.get('theme')?.value
  const isDark = themeCookie === 'dark'

  // 3. 获取系统主题偏好（仅服务器端模拟，实际以客户端为准）
  const userAgent = request.headers.get('user-agent') || ''
  const prefersDark = userAgent.includes('Dark Mode')

  // 4. 决定最终主题（Cookie优先，否则使用系统偏好）
  const shouldBeDark = themeCookie ? isDark : prefersDark

  // 5. 克隆响应并添加主题类名到HTML
  const response = NextResponse.next()
  response.headers.set('x-theme', shouldBeDark ? 'dark' : 'light')

  // 6. 添加安全相关headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

// 应用于所有路由
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
