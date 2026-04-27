import { Suspense } from 'react'

export default function BlogInfoLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--bg))]">
      <Suspense>{children}</Suspense>
    </div>
  )
}
