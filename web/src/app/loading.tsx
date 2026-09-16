export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--muted-foreground))] border-t-transparent" />
    </div>
  )
}