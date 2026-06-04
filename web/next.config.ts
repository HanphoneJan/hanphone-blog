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

// 从环境变量读取文件服务域名，默认为 hanphone.top
const fileDomain = process.env.NEXT_PUBLIC_FILE_DOMAIN || 'hanphone.top'

const isStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  trailingSlash: true,
  // 静态导出配置（Tauri / GitHub Pages 使用）
  ...(isStaticExport && {
    output: 'export',
    distDir: 'dist',
    basePath: process.env.GITHUB_PAGES_BASE_PATH || '',
    assetPrefix: process.env.GITHUB_PAGES_BASE_PATH || '',
  }),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: fileDomain,
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'http',
        hostname: fileDomain,
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '/**'
      }
    ]
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
      // 处理 /games 和 /games/
      {
        source: '/games',
        destination: '/games/index.html',
      },
      {
        source: '/games/',
        destination: '/games/index.html',
      },
      // 处理 /games/子路径
      {
        source: '/games/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/games/:path/index.html',
      },
      // 处理 /tools 和 /tools/
      {
        source: '/tools',
        destination: '/tools/index.html',
      },
      {
        source: '/tools/',
        destination: '/tools/index.html',
      },
      // 处理 /tools/子路径
      {
        source: '/tools/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/tools/:path/index.html',
      },
      // 处理 /play 和 /play/
      {
        source: '/play',
        destination: '/play/index.html',
      },
      {
        source: '/play/',
        destination: '/play/index.html',
      },
      // 处理 /play/子路径
      {
        source: '/play/:path((?!.*\\.)[^/]+(?:/[^/]+)*)',
        destination: '/play/:path/index.html',
      },
    ]
  },
  // 排除 react-pdf 从服务端打包 (Turbopack 兼容)
  serverExternalPackages: ['react-pdf'],
}

export default isDev ? nextConfig : withSerwist(nextConfig)