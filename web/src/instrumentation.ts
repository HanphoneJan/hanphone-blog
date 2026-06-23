export async function register() {
  // 避免在构建阶段启动调度器
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.NODE_ENV !== 'production') return

  // Edge Runtime 不支持 Node.js 内置模块（fs, path, crypto）
  // 此条件会被 Turbopack 树摇优化，在 Edge build 中消除本次 import
  if (process.env.NEXT_RUNTIME === 'edge') return

  // 网易云 Cookie 刷新已由外部定时任务接管，不再在进程内启动调度器
}
