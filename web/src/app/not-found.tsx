import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-[rgb(var(--primary))]">404</p>
      <p className="text-lg text-[rgb(var(--muted-foreground))]">页面不存在或已被移除</p>
      <Link
        href="/"
        className="rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-white transition-opacity hover:opacity-90"
      >
        返回首页
      </Link>
    </div>
  )
}