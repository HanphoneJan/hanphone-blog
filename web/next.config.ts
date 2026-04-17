import type { NextConfig } from 'next'
import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  Date.now().toString()

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/offline', revision }]
})

// 从环境变量读取文件服务域名，默认为 hanphone.top
const fileDomain = process.env.NEXT_PUBLIC_FILE_DOMAIN || 'hanphone.top'

const isStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  // GitHub Pages 静态导出配置
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
        pathname: '/**' // 允许该域名下所有图片
      },
      {
        protocol: 'http', // 添加http支持
        hostname: fileDomain,
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '/**' // 允许该域名下所有图片
      }
    ]
  },
  eslint: {
    // 生成期间禁用eslint
    ignoreDuringBuilds: true
  },
  typescript: {
    // 生成期间禁用类型检查
    ignoreBuildErrors: true
  },
  experimental: {
    scrollRestoration: false
  },
  // 排除 react-pdf 从服务端打包
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('react-pdf')
      }
    }
    return config
  },
}

export default withSerwist(nextConfig)
