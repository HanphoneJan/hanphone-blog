import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(__dirname, '..')

const backups = new Map()

function patchFile(content, insertText) {
  let cleaned = content.replace(/\r\n/g, '\n')
  // 删除所有已有的 export const dynamic = ... 行
  cleaned = cleaned.replace(/^export const dynamic = ['"][^'"]*['"]\s*\n?/gm, '')
  // 删除文件开头的多余空行
  cleaned = cleaned.replace(/^\n+/, '')
  // 在最后一个 import 之后插入（避免放在文件开头导致 SWC 解析异常）
  const lines = cleaned.split('\n')
  let lastImportIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) {
      lastImportIndex = i
    }
  }
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, '', "export const dynamic = 'force-static'")
    return lines.join('\n') + '\n'
  }
  // 如果没有 import，在文件开头插入
  return insertText + cleaned
}

function replacePairs(content, pairs) {
  let result = content.replace(/\r\n/g, '\n')
  for (const [search, replace] of pairs) {
    result = result.split(search).join(replace)
  }
  return result
}

// 需要添加 force-static 的文件
const forceStaticFiles = [
  'src/app/(main)/rss.xml/route.ts',
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'src/app/manifest.ts',
  'src/app/api/docs/[id]/route.ts',
  'src/app/(main)/blog/page.tsx',
  'src/app/(main)/blog/[id]/page.tsx',
  'src/app/(main)/docs/page.tsx',
  'src/app/(main)/docs/[id]/page.tsx',
  'src/app/(main)/about/page.tsx',
]

// 需要精确替换的文件
const replacementFiles = [
  {
    file: 'src/app/(main)/rss.xml/route.ts',
    pairs: [
      ["{ cache: 'no-store' }", '{}'],
    ],
  },
  {
    file: 'src/app/sitemap.ts',
    pairs: [
      ["{ next: { revalidate: 3600 } }", '{}'],
    ],
  },
  {
    file: 'src/app/(main)/blog/page.tsx',
    pairs: [
      ["{ cache: 'no-store' }", '{}'],
    ],
  },
  // blog/[id]/page.tsx 中的 cache: 'no-store' 是多行形式，单独用正则处理
  // (见步骤 2.5)
  {
    file: 'src/app/(main)/about/page.tsx',
    pairs: [
      ["{ cache: 'no-store' }", '{}'],
    ],
  },
  {
    file: 'src/app/(main)/docs/page.tsx',
    pairs: [
      ["{ next: { revalidate: 0 } }", '{}'],
    ],
  },
  {
    file: 'src/app/(main)/docs/[id]/page.tsx',
    pairs: [
      ["{ next: { revalidate: 0 } }", '{}'],
    ],
  },
]

function applyPatches() {
  // 1. 给指定文件添加 force-static
  for (const file of forceStaticFiles) {
    const filePath = path.join(webDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!backups.has(filePath)) backups.set(filePath, content)

    const patched = patchFile(content, "export const dynamic = 'force-static'\n\n")
    fs.writeFileSync(filePath, patched)
    console.log(`[force-static] ${file}`)
  }

  // 2. 精确替换
  for (const { file, pairs } of replacementFiles) {
    const filePath = path.join(webDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!backups.has(filePath)) backups.set(filePath, content)

    const replaced = replacePairs(content, pairs)
    if (replaced !== content.replace(/\r\n/g, '\n')) {
      fs.writeFileSync(filePath, replaced)
      console.log(`[replace] ${file}`)
    }
  }

  // 2.5 blog/[id]/page.tsx 中的 cache: 'no-store' 是多行形式，用正则处理
  const blogIdPath = path.join(webDir, 'src/app/(main)/blog/[id]/page.tsx')
  const blogIdContent = fs.readFileSync(blogIdPath, 'utf-8')
  // 正则匹配: , {\n  cache: 'no-store'\n} 或单行 , { cache: 'no-store' }
  const blogIdReplaced = blogIdContent.replace(/,\s*\{\s*cache:\s*['"]no-store['"]\s*\}/g, '')
  if (blogIdReplaced !== blogIdContent) {
    fs.writeFileSync(blogIdPath, blogIdReplaced)
    console.log(`[replace-cache] src/app/(main)/blog/[id]/page.tsx`)
  }

  // 3. 重写 location.ts
  const locationPath = path.join(webDir, 'src/lib/location.ts')
  const locationContent = fs.readFileSync(locationPath, 'utf-8')
  if (!backups.has(locationPath)) backups.set(locationPath, locationContent)
  fs.writeFileSync(locationPath, `export async function getLocationInfo() {\n  return {\n    loginProvince: '',\n    loginCity: '',\n    loginLat: 30.27,\n    loginLng: 103.08\n  }\n}\n`)
  console.log(`[rewrite] src/lib/location.ts`)

  // 4. 重写 next-api/metadata
  const metadataPath = path.join(webDir, 'src/app/next-api/metadata/route.tsx')
  const metadataContent = fs.readFileSync(metadataPath, 'utf-8')
  if (!backups.has(metadataPath)) backups.set(metadataPath, metadataContent)
  fs.writeFileSync(metadataPath, `export const dynamic = 'force-static'\n\nexport async function GET() {\n  return new Response(JSON.stringify({ title: '', description: '', avatar: '' }), {\n    headers: { 'Content-Type': 'application/json' }\n  })\n}\n`)
  console.log(`[rewrite] src/app/next-api/metadata/route.tsx`)

  // 5. api/docs/[id] 还需要 generateStaticParams
  const apiDocsIdPath = path.join(webDir, 'src/app/api/docs/[id]/route.ts')
  const apiDocsIdContent = fs.readFileSync(apiDocsIdPath, 'utf-8')
  if (!apiDocsIdContent.includes('generateStaticParams')) {
    const patched = apiDocsIdContent.replace(
      "export const dynamic = 'force-static'\n\n",
      "export const dynamic = 'force-static'\n\nexport async function generateStaticParams() {\n  return [{ id: 'placeholder' }]\n}\n\n"
    )
    fs.writeFileSync(apiDocsIdPath, patched)
    console.log(`[generateStaticParams] src/app/api/docs/[id]/route.ts`)
  }

  // 6. 临时移除 api/docs/route.ts，避免与 api/docs/[id] 静态导出时文件名冲突
  const apiDocsRoutePath = path.join(webDir, 'src/app/api/docs/route.ts')
  if (fs.existsSync(apiDocsRoutePath)) {
    const apiDocsRouteContent = fs.readFileSync(apiDocsRoutePath, 'utf-8')
    if (!backups.has(apiDocsRoutePath)) backups.set(apiDocsRoutePath, apiDocsRouteContent)
    fs.unlinkSync(apiDocsRoutePath)
    console.log(`[remove] src/app/api/docs/route.ts`)
  }
}

function restoreFiles() {
  for (const [filePath, content] of backups) {
    fs.writeFileSync(filePath, content)
    console.log(`[restore] ${path.relative(webDir, filePath)}`)
  }
}

// 主流程
try {
  applyPatches()

  console.log('[build] Running next build with STATIC_EXPORT=true...')
  execSync('pnpm next build --turbopack', {
    stdio: 'inherit',
    cwd: webDir,
    env: { ...process.env, STATIC_EXPORT: 'true' },
    shell: true,
  })
} catch (error) {
  console.error('[build] Build failed:', error.message)
  process.exit(1)
} finally {
  restoreFiles()
}
