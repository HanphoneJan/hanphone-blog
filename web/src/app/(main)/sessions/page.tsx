import type { Metadata } from 'next'
import SessionsClient from './SessionsClient'

export const metadata: Metadata = {
  title: '登录设备',
  // 登录态个人页不进索引
  robots: {
    index: false,
    follow: false
  }
}

export default function SessionsPage() {
  return <SessionsClient />
}
