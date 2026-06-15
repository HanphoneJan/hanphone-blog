import { API_BASE_URL } from '@/lib/api'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

/**
 * 网易云 Cookie 刷新失败时，向后端内部接口发送管理员告警邮件。
 * 如果未配置 INTERNAL_API_KEY，则静默跳过。
 */
export async function sendRefreshFailureAlert(error: string): Promise<void> {
  if (!INTERNAL_API_KEY || !API_BASE_URL) {
    console.warn('未配置 INTERNAL_API_KEY 或 API_BASE_URL，跳过邮件告警')
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/internal/alert/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        subject: '网易云音乐 Cookie 自动刷新失败',
        content: `Cookie 自动刷新失败，可能需要手动重新配置：\n\n${error}\n\n时间：${new Date().toLocaleString()}`,
      }),
    })

    if (!res.ok) {
      console.error('发送告警邮件失败:', res.status, await res.text())
    }
  } catch (e) {
    console.error('调用告警邮件接口异常:', e)
  }
}
