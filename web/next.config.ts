import type { NextConfig } from 'next'
import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  Date.now().toString()

const isDev = process.env.NODE_ENV !== 'production'

const swVersion = String(revision).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'dev'
const swFile = `sw-${swVersion}.js`

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  // 文件名带构建版本：避免 Cloudflare 把 /sw.js 缓存 4h，导致旧 Service Worker 长期钉住
  swDest: `public/${swFile}`,
  swUrl: `/${swFile}`,
  disable: isDev,
  // 不预缓存全部静态/字体（旧 SW 490 条 precache 会长时间停在 installing）；
  // 页面/字体仍由 sw.ts 的 runtimeCaching 按需缓存。
  globPublicPatterns: [],
  exclude: [/\.(?:woff2?|ttf|otf|eot|png|jpe?g|svg|gif|webp|avif|ico|apng)$/],
  additionalPrecacheEntries: [{ url: '/offline', revision }]
})

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    // 类型错误必须让构建失败；CI 另有 `tsc --noEmit` 一步，这里作为最后一道闸门。
    ignoreBuildErrors: false
  },
  experimental: {
    scrollRestoration: false
  },
  async rewrites() {
    return [
      // 处理 /games 子路径（静态游戏文件）
      {
        source: '/games/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/games/:path/index.html',
      },
      // 处理 /tools 子路径（静态工具文件）
      {
        source: '/tools/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/tools/:path/index.html',
      },
      // 处理 /play 子路径（静态练习文件）
      {
        source: '/play/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/play/:path/index.html',
      },
    ]
  },
}

export default isDev ? nextConfig : withSerwist(nextConfig)