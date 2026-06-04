#!/usr/bin/env node
/**
 * generate-tools.js
 *
 * 以目录结构为准，自动生成 index.html 的 TOOLS 数组与 README.md 工具表格。
 *
 * 元数据来源（无需任何配置文件）：
 *   - webpage : 读子目录 index.html 的 <title> 和 <meta name="description">
 *   - extension: 读子目录 manifest.json 的 name / description 字段
 *   - 图标 / 颜色: 按目录名哈希自动分配，结果稳定
 *
 * 用法：node scripts/generate-tools.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const INDEX_PATH  = path.join(ROOT, 'index.html');
const README_PATH = path.join(ROOT, 'README.md');

const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'scripts']);

/* ── 颜色 / 图标池 ── */
const PALETTES = [
  { iconBg: 'rgba(251, 146, 60, 0.15)',  iconColor: '#fb923c' },
  { iconBg: 'rgba(96, 165, 250, 0.15)',  iconColor: '#60a5fa' },
  { iconBg: 'rgba(74, 222, 128, 0.15)',  iconColor: '#4ade80' },
  { iconBg: 'rgba(167, 139, 250, 0.15)', iconColor: '#a78bfa' },
  { iconBg: 'rgba(244, 114, 182, 0.15)', iconColor: '#f472b6' },
  { iconBg: 'rgba(45, 212, 191, 0.15)',  iconColor: '#2dd4bf' },
];

const WEBPAGE_ICONS    = ['🧮','📝','🖼️','🎨','🔍','📊','🗂️','🛠️','📐','🌐'];
const EXTENSION_ICONS  = ['🛡️','🔌','🧩','🔧','⚙️'];

function hash(str) {
  let h = 0;
  for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function pick(arr, key) { return arr[hash(key) % arr.length]; }

/* ── 从 HTML 文件提取 <title> 和 <meta name="description"> ── */
function parseHtmlMeta(file) {
  const html  = fs.readFileSync(file, 'utf8');
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || '';
  const desc  = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
              || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
              || [])[1]?.trim() || '';
  return { title, desc };
}

/* ── 扫描目录，收集工具信息 ── */
function scanTools() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP_DIRS.has(d.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => {
      const dir          = d.name;
      const indexFile    = path.join(ROOT, dir, 'index.html');
      const manifestFile = path.join(ROOT, dir, 'manifest.json');

      if (fs.existsSync(indexFile)) {
        const { title, desc } = parseHtmlMeta(indexFile);
        return {
          name:      title || dir,
          dir:       dir + '/',
          href:      dir + '/index.html',
          icon:      pick(WEBPAGE_ICONS, dir),
          ...pick(PALETTES, dir),
          desc:      desc || '暂无描述',
          tags:      [],
          type:      'webpage',
        };
      }

      if (fs.existsSync(manifestFile)) {
        const mf = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        return {
          name:      mf.name || dir,
          dir:       dir + '/',
          href:      dir + '/',
          icon:      pick(EXTENSION_ICONS, dir),
          ...pick(PALETTES, dir + '_ext'),
          desc:      mf.description || '暂无描述',
          tags:      [],
          type:      'extension',
          wide:      true,
        };
      }

      return null;
    })
    .filter(Boolean);
}

/* ── 序列化单个工具条目 ── */
function serializeTool(t) {
  const s = JSON.stringify;
  const lines = [
    '  {',
    `    name: ${s(t.name)},`,
    `    dir: ${s(t.dir)},`,
    `    href: ${s(t.href)},`,
    `    icon: ${s(t.icon)},`,
    `    iconBg: ${s(t.iconBg)},`,
    `    iconColor: ${s(t.iconColor)},`,
    `    desc: ${s(t.desc)},`,
    `    tags: [],`,
  ];
  if (t.wide) lines.push(`    wide: true,`);
  lines.push('  }');
  return lines.join('\n');
}

/* ── 写入 index.html 的 TOOLS 区间 ── */
function writeIndexHtml(tools) {
  const html  = fs.readFileSync(INDEX_PATH, 'utf8');
  const START = '// <!-- TOOLS_START -->';
  const END   = '// <!-- TOOLS_END -->';
  const si    = html.indexOf(START);
  const ei    = html.indexOf(END);
  if (si === -1 || ei === -1) {
    console.error('❌ index.html 缺少 TOOLS_START / TOOLS_END 标记'); process.exit(1);
  }
  const block =
    START + '\n' +
    '  const TOOLS = [\n' +
    tools.map(serializeTool).join(',\n') + ',\n' +
    '  ];\n' +
    END;
  fs.writeFileSync(INDEX_PATH, html.slice(0, si) + block + html.slice(ei + END.length), 'utf8');
  console.log(`✅ index.html 已更新（${tools.length} 个工具）`);
}

/* ── 写入 README.md 工具表格 ── */
function writeReadme(tools) {
  const START = '<!-- TOOLS_START -->';
  const END   = '<!-- TOOLS_END -->';
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const si = readme.indexOf(START);
  const ei = readme.indexOf(END);
  if (si === -1 || ei === -1) {
    console.warn('⚠️  README.md 缺少 TOOLS_START / TOOLS_END 标记，跳过'); return;
  }
  const typeLabel = { webpage: '网页', extension: '扩展' };
  const rows = tools.map(t =>
    `| ${t.icon} ${t.name} | [\`${t.dir}\`](${t.dir}) | ${t.desc} | ${typeLabel[t.type] || '-'} |`
  );
  const table = [
    '| 工具 | 目录 | 描述 | 类型 |',
    '|------|------|------|------|',
    ...rows,
  ].join('\n');
  fs.writeFileSync(
    README_PATH,
    readme.slice(0, si) + START + '\n' + table + '\n' + END + readme.slice(ei + END.length),
    'utf8'
  );
  console.log('✅ README.md 已更新');
}

/* ── 主流程 ── */
const tools = scanTools();
if (tools.length === 0) { console.error('❌ 未发现任何工具目录'); process.exit(1); }
writeIndexHtml(tools);
writeReadme(tools);
