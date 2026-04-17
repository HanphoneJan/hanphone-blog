import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, Serwist } from 'serwist'

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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [navigationRuntimeCache, ...defaultCache],
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
