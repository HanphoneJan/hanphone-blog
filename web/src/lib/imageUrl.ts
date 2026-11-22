/**
 * 图片地址校验与规范化。
 *
 * 后台所有图片字段都允许“上传”或“手填 URL”，手填地址只接受 http/https：
 * - `javascript:` 之类虽然放进 <img src> 不会执行，但没有理由放行；
 * - `data:` 会绕过后端体积限制，尤其不建议在后台表单里接受。
 */
export function isHttpUrl(value: string): boolean {
  const raw = value.trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** 去掉首尾空白；不做其它改写，避免破坏带签名的图片地址 */
export function normalizeImageUrl(value: string): string {
  return value.trim()
}

export const IMAGE_URL_ERROR = '请输入 http:// 或 https:// 开头的图片地址'
