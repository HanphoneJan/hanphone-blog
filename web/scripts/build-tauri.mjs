import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(__dirname, '..')

const backups = new Map()

/**
 * 解析 .env 文件（仅支持简单的 KEY=VALUE，足以覆盖 NEXT_PUBLIC_* 公开变量）
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const result = {}
  for (const rawLine of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // 去掉行尾注释（未被引号包裹时）
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '').trim()
    // 去掉成对引号
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1)
    result[key] = value
  }
  return result
}

/**
 * 加载 .env.build 作为构建期默认环境变量。
 *
 * 目的：让 GitHub Actions（仓库里没有 .env，因为被 gitignore）与本地构建出一样的产物。
 * .env.build 只允许存放 NEXT_PUBLIC_* 等会内联到浏览器包里的公开变量，禁止放密钥。
 * 优先级：真实环境变量 > .env.build（Next.js 自己加载的 .env 优先级最高，不受影响）
 */
function loadBuildEnv() {
  const file = path.join(webDir, '.env.build')
  const parsed = parseEnvFile(file)
  const applied = []
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
      applied.push(key)
    }
  }
  if (fs.existsSync(file)) {
    console.log(`[env] 载入 .env.build（${Object.keys(parsed).length} 项，新注入 ${applied.length} 项）`)
  } else {
    console.log('[env] 未找到 .env.build，构建将依赖真实环境变量')
  }
}

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
      ["{ next: { revalidate: 300 } }", '{}'],
    ],
  },
  {
    file: 'src/app/next-api/music/route.ts',
    pairs: [
      ["export const runtime = 'nodejs'\n\n", "export const dynamic = 'force-static'\n\n"],
      // 完全替换为静态响应，因为 request.url 无法静态导出
      [/export async function GET[\s\S]*$/, `export async function GET() {\n  return NextResponse.json({ error: '音乐功能在桌面端不可用' }, { status: 503 })\n}`],
    ],
  },
  {
    file: 'src/app/next-api/admin/music/cookie/route.ts',
    pairs: [
      ["export const runtime = 'nodejs'\n\n", "export const dynamic = 'force-static'\n\n"],
    ],
  },
  {
    file: 'src/app/next-api/cron/refresh-netease-cookie/route.ts',
    pairs: [
      ["export const runtime = 'nodejs'\n\n", "export const dynamic = 'force-static'\n\n"],
      // 完全替换为静态响应，因为 request.headers 无法静态导出
      [/export async function GET[\s\S]*$/, `export async function GET() {\n  return NextResponse.json({ error: 'Cookie 刷新功能在桌面端不可用' }, { status: 503 })\n}`],
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

  // 2.5 静态导出时，动态路由的 generateStaticParams 必须至少产出一条路径，
  //      否则 Next.js 15 会报 E87（"missing generateStaticParams()"）。
  //      CI 里仓库没有 .env（被 gitignore），构建时后端不可达会返回空数组，
  //      所以这里统一兜底一个占位 id，保证构建不因网络问题失败。
  const staticParamFallbacks = [
    {
      file: 'src/app/(main)/blog/[id]/page.tsx',
      pattern: /export async function generateStaticParams\(\)\s*\{[\s\S]*?\n\}/,
      replacement: `export async function generateStaticParams() {
  let params: { id: string }[] = []
  try {
    const res = await fetch(\`\${ENDPOINTS.BLOGS}?pagenum=1&pagesize=100\`)
    const data = await res.json()
    if (data.code === API_CODE.SUCCESS && data.data) {
      params = (data.data.content || []).map((blog: { id: number }) => ({ id: String(blog.id) }))
    }
  } catch {
    // 构建时后端不可用，交由下方占位符兜底
  }
  // 占位符：保证 output: export 下至少有静态路径可生成
  return params.length > 0 ? params : [{ id: '__static_export_placeholder__' }]
}`,
    },
    {
      file: 'src/app/(main)/docs/[id]/page.tsx',
      pattern: /export async function generateStaticParams\(\)\s*\{[\s\S]*?\n\}/,
      replacement: `export async function generateStaticParams() {
  const docs = await getDocsFromBackend()
  const params = docs.map((d) => ({ id: d.id }))
  // 占位符：保证 output: export 下至少有静态路径可生成
  return params.length > 0 ? params : [{ id: '__static_export_placeholder__' }]
}`,
    },
  ]

  for (const { file, pattern, replacement } of staticParamFallbacks) {
    const filePath = path.join(webDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!backups.has(filePath)) backups.set(filePath, content)

    if (!pattern.test(content)) {
      throw new Error(`[generateStaticParams] 未能在 ${file} 中匹配到 generateStaticParams，请检查该函数是否被改动`)
    }
    const patched = content.replace(pattern, replacement)
    if (patched !== content) {
      fs.writeFileSync(filePath, patched)
      console.log(`[generateStaticParams] ${file}`)
    }
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
  backups.clear()
}

// 主流程
try {
  loadBuildEnv()
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
  // 注意：这里不能直接 process.exit()，否则 finally 里的 restoreFiles() 不会执行，
  // 会把打过补丁的源码留在工作区（本地/CI 都可能被污染）。
  process.exitCode = 1
} finally {
  restoreFiles()
}
