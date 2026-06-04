/**
 * 纯前端解析友链申请文本
 * 支持格式：
 * 1. 中文键值对：名称: xxx / 链接: xxx
 * 2. JSON：{"name": "xxx", "url": "xxx"}
 * 3. YAML：name: xxx\nurl: xxx
 * 4. 常见博客主题格式（Hexo/Fluid/Butterfly等）
 */

export interface ParsedApplyText {
  name?: string
  description?: string
  url?: string
  link_url?: string
  avatar?: string
  siteshot?: string
  rss?: string
  nickname?: string
  color?: string
}

// 关键词映射：支持多种写法 → 标准字段名
const FIELD_KEYWORDS: Record<keyof ParsedApplyText, string[]> = {
  name: ['名称', '站点名', '标题', '网站名', '站点', '名字', 'name', 'title', 'sitename', 'blogname'],
  url: ['链接', '网址', '地址', '网站', 'url', 'site', 'link', 'href', 'homepage'],
  description: ['描述', '简介', '说明', '介绍', '签名', 'descr', 'description', 'desc', 'bio', 'motto'],
  avatar: ['头像', '图标', 'logo', '头像地址', '图标地址', 'avatar', 'icon', 'favicon'],
  siteshot: ['截图', '预览', '预览图', '站点截图', '网站截图', '封面图', 'siteshot', 'screenshot', 'cover'],
  rss: ['rss', '订阅', 'feed', 'atom', 'xml'],
  nickname: ['昵称', '站长', '作者', '名字', '网名', 'nickname', 'author', 'blogger'],
  color: ['颜色', '主题色', '装饰色', '配色', 'color', 'theme', 'accent'],
  link_url: ['回访链接', '回访地址', '回访网址', '回访', 'backlink', 'link_url'],
}

// 颜色正则
const COLOR_REGEX = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/i

// URL 正则
const URL_REGEX = /https?:\/\/[^\s"'<>\n,，]+/i

/**
 * 尝试解析 JSON 格式
 */
function tryParseJSON(text: string): ParsedApplyText | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null

  try {
    const data = JSON.parse(trimmed)
    const source = Array.isArray(data) ? data[0] : data
    if (!source || typeof source !== 'object') return null

    const result: ParsedApplyText = {}
    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      for (const key of keywords) {
        // 尝试大小写不敏感匹配
        const matchedKey = Object.keys(source).find(
          k => k.toLowerCase() === key.toLowerCase()
        )
        if (matchedKey !== undefined && source[matchedKey]) {
          (result as Record<string, string>)[field] = String(source[matchedKey]).trim()
          break
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}

/**
 * 尝试解析 YAML 格式
 */
function tryParseYAML(text: string): ParsedApplyText | null {
  const lines = text.split('\n')
  const result: ParsedApplyText = {}

  for (const line of lines) {
    const match = line.match(/^\s*([^:]+?)\s*[:：]\s*(.+?)\s*$/)
    if (!match) continue

    const [, rawKey, rawValue] = match
    const key = rawKey.trim().toLowerCase()
    const value = rawValue.trim().replace(/^["']|["']$/g, '')

    if (!value) continue

    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      if (keywords.some(kw => key === kw.toLowerCase())) {
        const existing = (result as Record<string, string>)[field]
        // link_url 和 url 要区分：如果 key 精确匹配 link_url 或 回访 用 link_url，否则用 url
        if (field === 'url' && (key.includes('回访') || key === 'link_url' || key === 'backlink')) {
          if (!result.link_url) result.link_url = value
        } else if (field === 'link_url' && !key.includes('回访') && key !== 'link_url' && key !== 'backlink') {
          // 跳过，这是 url 的匹配
        } else if (!existing) {
          (result as Record<string, string>)[field] = value
        }
        break
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

/**
 * 解析自由文本格式（中文键值对、常见主题格式等）
 */
function tryParseFreeText(text: string): ParsedApplyText | null {
  const result: ParsedApplyText = {}

  // 行内匹配模式
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const patternStr = keywords
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')

    // 匹配 "关键词: 值" 或 "关键词：值" 格式，支持中英文冒号
    const regex = new RegExp(
      `(?:^|[\\n\\r])\\s*(?:${patternStr})\\s*[:：]\\s*["']?([^"\\n\\r,，]+?)["']?\\s*(?:$|[\\n\\r])`,
      'im'
    )

    const match = text.match(regex)
    if (match && match[1]) {
      const value = match[1].trim().replace(/[,，;；\s]+$/, '')
      if (value) {
        // 区分 url 和 link_url：如果关键词是"回访"相关，优先放 link_url
        if (field === 'url') {
          const keyMatch = text
            .substring(Math.max(0, (match.index || 0) - 20), match.index || 0)
            .toLowerCase()
          if (keyMatch.includes('回访') || keyMatch.includes('backlink')) {
            if (!result.link_url) result.link_url = value
            continue
          }
        }
        const existing = (result as Record<string, string>)[field]
        if (!existing) {
          (result as Record<string, string>)[field] = value
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

/**
 * 备用提取：从文本中提取第一个独立 URL 作为 url
 */
function extractUrlFallback(text: string, usedUrls: Set<string>): string | undefined {
  const urlMatches = text.match(new RegExp(URL_REGEX.source, 'gi'))
  if (!urlMatches) return undefined

  for (const url of urlMatches) {
    const clean = url.trim()
    if (!usedUrls.has(clean) && !clean.includes('favicon') && !clean.includes('avatar')) {
      return clean
    }
  }
  return undefined
}

/**
 * 主解析函数
 */
export function parseApplyText(text: string): ParsedApplyText {
  if (!text || !text.trim()) {
    return {}
  }

  const trimmed = text.trim()

  // 1. 尝试 JSON
  let result = tryParseJSON(trimmed)
  if (result) return result

  // 2. 尝试 YAML/键值对
  result = tryParseYAML(trimmed)
  if (result) return result

  // 3. 尝试自由文本
  result = tryParseFreeText(trimmed)

  // 收集已使用的 URL
  const usedUrls = new Set<string>()
  if (result?.url) usedUrls.add(result.url)
  if (result?.link_url) usedUrls.add(result.link_url)
  if (result?.avatar) usedUrls.add(result.avatar)
  if (result?.siteshot) usedUrls.add(result.siteshot)
  if (result?.rss) usedUrls.add(result.rss)

  // 如果 URL 为空，尝试从文本中提取
  if (!result?.url) {
    const fallbackUrl = extractUrlFallback(trimmed, usedUrls)
    if (fallbackUrl) {
      result = result || {}
      result.url = fallbackUrl
    }
  }

  return result || {}
}
