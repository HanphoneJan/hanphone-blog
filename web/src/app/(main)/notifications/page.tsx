import type { Metadata } from 'next'
import NotificationsClient from './NotificationsClient'

export const metadata: Metadata = {
  title: '我的通知',
  // 登录态个人页不进索引
  robots: {
    index: false,
    follow: false
  }
}

export default function NotificationsPage() {
  return <NotificationsClient />
}
