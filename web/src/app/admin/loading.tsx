export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce" />
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce [animation-delay:0.1s]" />
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce [animation-delay:0.2s]" />
      </div>
      <p className="mt-4 text-sm text-[rgb(var(--muted))]">加载中...</p>
    </div>
  )
}