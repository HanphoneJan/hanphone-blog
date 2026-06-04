#!/usr/bin/env node
/**
 * update-index.js
 * 自动扫描项目子目录，更新 index.html 和 README.md 中的项目数据。
 *
 * 用法：node scripts/update-index.js
 *
 * 新增项目只需：
 *  1. 在根目录新建文件夹并放入 index.html（含 <title>）
 *  2. 在下方 PROJECT_PRESETS 中补充 emoji / tag / color（可选）
 *  3. 运行本脚本，或 push 后由 GitHub Actions 自动执行
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* ── 跳过的顶层目录 ── */
const SKIP = new Set(['.git', '.github', 'node_modules', 'scripts', '.claude']);

/* ── 每个项目的预设配置 ──
 * entry:         子目录名（index.html 不在根目录时），会拼接 /index.html 查找
 * entryFile:     完整的相对文件路径（当入口不叫 index.html 时），相对于项目目录
 * titleOverride: 手动覆盖从 HTML 提取的标题
 */
const PROJECT_PRESETS = {
  'canvas-particle-universe': { emoji: '🎆', tag: 'canvas', color: '#fbbf24' },
  'congratulation':           { emoji: '🎉', tag: '节日',   color: '#f472b6' },
  'hanphonechat':             { emoji: '💬', tag: 'ai',     color: '#22d3ee', entry: 'browser' },
  'happy-birthday':           { emoji: '🎂', tag: '节日',   color: '#f472b6' },
  'letter':                   { emoji: '💌', tag: '爱情',   color: '#fb7185', entryFile: 'browser2/envelope.html', titleOverride: '来自寒枫的信' },
  'lottery':                  { emoji: '🎰', tag: '游戏',   color: '#fbbf24' },
  'love-chiikawa':            { emoji: '🐾', tag: '爱情',   color: '#f472b6' },
  'love-guess-moss':          { emoji: '🔐', tag: '爱情',   color: '#a78bfa' },
  'love-memory':              { emoji: '🌸', tag: '爱情',   color: '#f472b6' },
  'read':                     { emoji: '📖', tag: '工具',   color: '#34d399', entry: 'replicant', titleOverride: '博客阅读器' },
  'resume':                   { emoji: '📄', tag: '工具',   color: '#22d3ee' },
  'simple-piano':             { emoji: '🎹', tag: '创意',   color: '#a78bfa' },
  'todo':                     { emoji: '✅', tag: '工具',   color: '#34d399' },
  'torus-knot-geometry':      { emoji: '🌀', tag: '3d',     color: '#22d3ee' },
  'visual-player':            { emoji: '🎵', tag: '创意',   color: '#a78bfa' },
};

const DEFAULT_PRESET = { emoji: '✨', tag: '其他', color: '#c084fc' };

/* ─────────────────────────────────────── */

/** 从 HTML 文件提取 <title> 内容 */
function extractTitle(htmlPath) {
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** 扫描根目录，返回排序后的项目列表 */
function scanProjects() {
  const dirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP.has(e.name))
    .map(e => e.name)
    .sort();

  const projects = [];

  for (const dir of dirs) {
    const preset = { ...DEFAULT_PRESET, ...(PROJECT_PRESETS[dir] || {}) };
    let entryPath = '';
    let title     = null;

    /* 1. 自定义入口文件（如 browser2/envelope.html） */
    if (preset.entryFile) {
      const abs = path.join(ROOT, dir, preset.entryFile);
      if (fs.existsSync(abs)) {
        entryPath = `${dir}/${preset.entryFile}`;
        title     = extractTitle(abs);
      }
    }

    /* 2. 子目录下的 index.html（如 browser/index.html） */
    if (!entryPath && preset.entry) {
      const sub = path.join(ROOT, dir, preset.entry, 'index.html');
      if (fs.existsSync(sub)) {
        entryPath = `${dir}/${preset.entry}/`;
        title     = extractTitle(sub);
      }
    }

    /* 3. 直接 index.html */
    if (!entryPath) {
      const idx = path.join(ROOT, dir, 'index.html');
      if (fs.existsSync(idx)) {
        entryPath = `${dir}/`;
        title     = extractTitle(idx);
      }
    }

    if (!entryPath) continue; /* 无入口，跳过 */

    /* 标题优先级：手动覆盖 > HTML 提取 > 目录名 */
    if (preset.titleOverride) title = preset.titleOverride;
    if (!title || !title.trim()) title = dir;

    projects.push({
      dir,
      path:  entryPath,
      title,
      emoji: preset.emoji,
      tag:   preset.tag,
      color: preset.color,
    });
  }

  return projects;
}

/** 替换 index.html 中 <script id="projects-data"> 块 */
function updateIndexHtml(projects) {
  const file = path.join(ROOT, 'index.html');
  if (!fs.existsSync(file)) { console.log('⚠  index.html 不存在，跳过'); return; }

  const original = fs.readFileSync(file, 'utf-8');
  const json = JSON.stringify(projects, null, 2)
    .replace(/^/gm, (_, i) => i === 0 ? '' : '  ')  // 整体缩进
    .trimEnd();

  const newBlock = `<script id="projects-data" type="application/json">\n${json}\n  </script>`;
  const updated  = original.replace(
    /<script id="projects-data"[^>]*>[\s\S]*?<\/script>/,
    newBlock
  );

  if (updated === original) { console.log('ℹ  index.html 无变化'); return; }
  fs.writeFileSync(file, updated, 'utf-8');
  console.log(`✅ index.html 已更新（${projects.length} 个项目）`);
}

/** 替换 README.md 中 <!-- PROJECTS_TABLE_START/END --> 之间的内容 */
function updateReadme(projects) {
  const file = path.join(ROOT, 'README.md');
  if (!fs.existsSync(file)) { console.log('⚠  README.md 不存在，跳过'); return; }

  const original = fs.readFileSync(file, 'utf-8');
  if (!original.includes('<!-- PROJECTS_TABLE_START -->')) {
    console.log('ℹ  README.md 无 PROJECTS_TABLE 标记，跳过');
    return;
  }

  const rows  = projects.map(p =>
    `| ${p.emoji} | [${p.title}](./${p.path}) | \`${p.dir}\` | \`${p.tag}\` |`
  ).join('\n');
  const table = `| 图标 | 项目 | 目录 | 分类 |\n|:----:|------|------|:----:|\n${rows}`;
  const block = `<!-- PROJECTS_TABLE_START -->\n${table}\n<!-- PROJECTS_TABLE_END -->`;

  const updated = original.replace(
    /<!-- PROJECTS_TABLE_START -->[\s\S]*?<!-- PROJECTS_TABLE_END -->/,
    block
  );

  if (updated === original) { console.log('ℹ  README.md 无变化'); return; }
  fs.writeFileSync(file, updated, 'utf-8');
  console.log(`✅ README.md 已更新（${projects.length} 个项目）`);
}

/* ─── Main ─── */
console.log('🔍 扫描项目目录...');
const projects = scanProjects();
console.log(`   发现 ${projects.length} 个项目：${projects.map(p => p.dir).join(', ')}\n`);
updateIndexHtml(projects);
updateReadme(projects);
console.log('\n🎉 完成！');
