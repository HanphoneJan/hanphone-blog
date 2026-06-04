#!/usr/bin/env node
/**
 * PWA 构建验证脚本
 * 检查 Service Worker 和 Manifest 相关文件是否正确生成
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const checks = []

// 1. 检查 public/sw.js 是否存在（构建后生成）
const swPath = path.join(root, 'public', 'sw.js')
if (fs.existsSync(swPath)) {
  const stat = fs.statSync(swPath)
  checks.push({ name: 'Service Worker (public/sw.js)', ok: true, detail: `存在, ${(stat.size / 1024).toFixed(1)} KB` })
} else {
  checks.push({ name: 'Service Worker (public/sw.js)', ok: false, detail: '未找到，请先执行 pnpm build' })
}

// 2. 检查 manifest 路由
const manifestPath = path.join(root, 'src', 'app', 'manifest.ts')
if (fs.existsSync(manifestPath)) {
  const content = fs.readFileSync(manifestPath, 'utf-8')
  const hasTheme = content.includes('theme_color')
  const hasIcons = content.includes('icon-192') && content.includes('icon-512')
  checks.push({ name: 'Manifest 配置', ok: hasTheme && hasIcons, detail: hasTheme && hasIcons ? '含 theme_color 与图标' : '缺少必要字段' })
} else {
  checks.push({ name: 'Manifest 配置', ok: false, detail: 'manifest.ts 不存在' })
}

// 3. 检查离线页
const offlinePath = path.join(root, 'src', 'app', 'offline', 'page.tsx')
checks.push({ name: '离线回退页 (/offline)', ok: fs.existsSync(offlinePath), detail: fs.existsSync(offlinePath) ? '存在' : '未找到' })

// 4. 检查 sw 源文件
const swSrcPath = path.join(root, 'src', 'app', 'sw.ts')
checks.push({ name: 'SW 源文件 (sw.ts)', ok: fs.existsSync(swSrcPath), detail: fs.existsSync(swSrcPath) ? '存在' : '未找到' })

// 输出结果
console.log('\nPWA 构建验证\n')
let allOk = true
checks.forEach(({ name, ok, detail }) => {
  const icon = ok ? '[OK]' : '[--]'
  if (!ok) allOk = false
  console.log(`  ${icon} ${name}: ${detail}`)
})
console.log('')
if (allOk) {
  console.log('PWA 相关文件验证通过')
  console.log('\n离线测试：请先 pnpm build && pnpm start，再运行 pnpm test:pwa\n')
} else {
  console.log('部分检查未通过，请先执行 pnpm build 完成构建\n')
  process.exit(1)
}
