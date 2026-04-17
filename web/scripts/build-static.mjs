#!/usr/bin/env node
/**
 * 本地构建静态导出脚本
 * 用于测试 GitHub Pages 构建
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const REPO_NAME = 'hanphone-blog-web'

console.log('🚀 开始构建静态导出...\n')

// 设置环境变量
process.env.STATIC_EXPORT = 'true'
process.env.GITHUB_PAGES_BASE_PATH = `/${REPO_NAME}`

console.log('📦 环境变量:')
console.log(`  STATIC_EXPORT: ${process.env.STATIC_EXPORT}`)
console.log(`  GITHUB_PAGES_BASE_PATH: ${process.env.GITHUB_PAGES_BASE_PATH}\n`)

try {
  // 执行构建
  console.log('🔨 执行 Next.js 构建...\n')
  execSync('next build', {
    stdio: 'inherit',
    cwd: process.cwd()
  })

  console.log('\n✅ 构建成功！')
  console.log(`📁 输出目录: dist/`)
  console.log(`🔗 本地预览: npx serve dist`)

} catch (error) {
  console.error('\n❌ 构建失败:', error.message)
  process.exit(1)
}
