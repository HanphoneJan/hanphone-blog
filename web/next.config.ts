import type { NextConfig } from 'next'
import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  Date.now().toString()

const isDev = process.env.NODE_ENV !== 'production'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: isDev,
  additionalPrecacheEntries: [{ url: '/offline', revision }]
})

const isStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  // 静态导出配置（Tauri / GitHub Pages 使用）
  ...(isStaticExport && {
    output: 'export',
    distDir: 'dist',
    basePath: process.env.GITHUB_PAGES_BASE_PATH || '',
    assetPrefix: process.env.GITHUB_PAGES_BASE_PATH || '',
  }),
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
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