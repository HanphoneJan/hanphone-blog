import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * 导航请求（document）使用 NetworkFirst，访问过的页面可离线打开。
 * 置于 runtimeCaching 首位，优先生效；请求失败时由 fallbacks 回退到 /offline。
 */
const navigationRuntimeCache: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) =>
    sameOrigin && request.destination === 'document',
  handler: new NetworkFirst({
    cacheName: 'pages-navigation',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60,
        maxAgeFrom: 'last-used'
      })
    ]
  })
}

/**
 * PWA 缓存策略：只缓存核心资源（HTML/JS/CSS/字体），不缓存图片/视频/大文件
 * 从 defaultCache 中过滤掉图片、音频、视频、Next.js 图片优化等资源
 */
const coreCache: RuntimeCaching[] = defaultCache.filter(entry => {
  // 排除图片资源 (jpg, jpeg, gif, png, svg, ico, webp)
  if (entry.matcher && typeof entry.matcher === 'object' && 'test' in entry.matcher) {
    const regex = entry.matcher as RegExp
    if (/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(regex.source)) return false
    if (/\/_next\/image\?url=.+$/i.test(regex.source)) return false
    if (/\.(?:mp3|wav|ogg)$/i.test(regex.source)) return false
    if (/\.(?:mp4|webm)$/i.test(regex.source)) return false
  }
  return true
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [navigationRuntimeCache, ...coreCache],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document'
      }
    ]
  }
})

serwist.addEventListeners()
