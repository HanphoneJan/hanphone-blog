export async function register() {
  // 避免在构建阶段启动调度器
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.NODE_ENV !== 'production') return

  const { startCookieRefreshScheduler } = await import(
    '@/lib/netease-cookie/scheduler'
  )
  startCookieRefreshScheduler()
}
