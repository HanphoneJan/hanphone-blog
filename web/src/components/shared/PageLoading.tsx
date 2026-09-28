export default function PageLoading({
  text = '加载中...',
  className = ''
}: {
  text?: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] bg-[rgb(var(--bg))] text-[rgb(var(--text))] ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce" />
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce [animation-delay:0.1s]" />
        <div className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] animate-bounce [animation-delay:0.2s]" />
      </div>
      {text && <p className="mt-4 text-sm text-[rgb(var(--muted))]">{text}</p>}
    </div>
  )
}