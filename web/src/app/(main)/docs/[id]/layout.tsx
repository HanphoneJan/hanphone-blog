export default function DocDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--bg))]">
      {children}
    </div>
  )
}
