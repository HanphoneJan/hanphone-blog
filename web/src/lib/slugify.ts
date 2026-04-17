/**
 * 将文本转换为 URL 友好的 slug
 * 支持中英文混合标题
 */
export function slugify(text: string): string {
  if (!text) return ''

  return text
    .toString()
    .trim()
    // 替换空格为连字符
    .replace(/\s+/g, '-')
    // 移除特殊字符，但保留中文字符
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    // 合并多个连字符
    .replace(/-+/g, '-')
    // 转换为小写
    .toLowerCase()
}

/**
 * 从 React children 中提取文本内容
 */
export function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children
  }

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('')
  }

  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as any).props.children)
  }

  return ''
}
