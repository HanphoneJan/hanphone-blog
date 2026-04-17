import { ADMIN_LINK_LABELS } from '@/lib/labels'
import { showAlert } from '@/lib/Alert'
import type { FormValues } from '../types'

// 表单验证
export function validateLinkForm(formValues: FormValues): boolean {
  if (!formValues.name.trim()) {
    showAlert(ADMIN_LINK_LABELS.NAME_REQUIRED)
    return false
  }
  if (!formValues.type.trim()) {
    showAlert(ADMIN_LINK_LABELS.TYPE_REQUIRED)
    return false
  }
  if (!formValues.url.trim()) {
    showAlert(ADMIN_LINK_LABELS.URL_REQUIRED)
    return false
  }
  return true
}

// URL格式验证
export function isValidUrl(url: string): boolean {
  if (!url) return true // 空值视为有效（可选字段）
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 颜色格式验证
export function isValidColor(color: string): boolean {
  if (!color) return true // 空值视为有效（可选字段）
  // 支持 #RGB, #RRGGBB, #RRGGBBAA
  return /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)
}

// 格式化日期显示
export function formatDate(dateString?: string): string {
  if (!dateString) return '未知时间'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('日期格式化错误:', error)
    return '无效日期'
  }
}
