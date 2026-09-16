'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg text-[rgb(var(--muted-foreground))]">页面加载出错了</p>
      <button
        onClick={reset}
        className="rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-white transition-opacity hover:opacity-90"
      >
        重试
      </button>
    </div>
  )
}