import type { Metadata } from 'next'
import BookmarksClient from './BookmarksClient'

export const metadata: Metadata = {
  title: '我的收藏',
  // 登录态个人页不进索引
  robots: {
    index: false,
    follow: false
  }
}

export default function BookmarksPage() {
  return <BookmarksClient />
}
