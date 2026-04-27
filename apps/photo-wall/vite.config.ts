//该文件是Vite的配置文件，用于配置Vite的插件、服务器、构建等选项。
// Vite的配置文件是一个ES Module，导出一个配置对象。
// Vite会自动加载项目根目录下的vite.config.ts文件，如果没有找到该文件，Vite会使用默认配置。

import { defineConfig } from 'vite'  // 导入vite配置模块
import vue from '@vitejs/plugin-vue'  // 导入vue插件
import { createHtmlPlugin } from 'vite-plugin-html';  // 导入vite-plugin-html插件，自定义HTML模板
import path from 'path'  // 导入path模块
import { fileURLToPath } from 'url';
import {VitePWA} from 'vite-plugin-pwa'; // 导入 VitePWA
import AutoImport from 'unplugin-auto-import/vite'  // 自动导入 API
import Components from 'unplugin-vue-components/vite'  // 自动导入组件
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'  // Element Plus 解析器

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 构建时自动生成版本号，格式如 v2026.04.04-a1b2，每次构建都会自动变化
const now = new Date()
const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
const buildVersion = `v${date}-${Date.now().toString(36).slice(-4)}`
// https://vite.dev/config/

export default defineConfig({
  // 项目根目录，根据部署环境设置不同的路径
  base: process.env.NODE_ENV === "production" ? "/atlas/" : "/",
  // 插件配置
  plugins: [
    vue(), // 注册vue插件
    // 自动导入 Element Plus 组件和 API
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: path.resolve(__dirname, 'src/auto-imports.d.ts'),  // 生成类型声明文件
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: path.resolve(__dirname, 'src/components.d.ts'),  // 生成类型声明文件
    }),
    // 注册自定义HTML插件
    createHtmlPlugin({
      minify: false,  // 禁用HTML压缩
      template: 'public/index.html',  // 指定模板文件，public目录
      inject: {
        // data: {
        //   title: 'index',
        //   injectScript: `<script src="/inject.js"></script>`,
        // },
        // tags: [
        //   {
        //     injectTo: 'body-prepend',
        //     tag: 'div',
        //     attrs: {
        //       id: 'tag',
        //     },
        //   },
        // ],
      }, // 插入自定义标签
    }),
    // 注册 VitePWA 插件
    VitePWA({
      scope: '/atlas/',              // 限定作用域
      registerType: 'autoUpdate', // 自动更新 Service Worker  
      injectRegister:'auto',
      //PWA可能会导致缓存问题
      devOptions: {
        enabled: false, // 开发环境中不启用 PWA
      },
      manifest: {
        name: '寒枫的照片墙',
        short_name: '照片墙',
        description: '寒枫的照片墙',
        theme_color: '#f8fafc',
        background_color: '#ffffff',
        icons: [
          {
            src: 'https://hanphone.top/blog/atlas/icon.png',
            sizes: '144x144',
            type: 'image/webp',
          },
        ],
      },
      workbox: {
        cacheId: `atlas-cache-${buildVersion}`, // 预缓存ID，每次构建变化以强制更新预缓存
        cleanupOutdatedCaches: true, // 清除过期的预缓存（仅对预缓存生效）
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 将限制提高到 50MB
        //运行时缓存是在用户访问资源时执行的，会将请求的资源缓存到 Service Worker 中。
        //注意：runtimeCaching 的 cacheName 必须使用固定名称，否则每次构建旧缓存成为孤儿无法被清理
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'atlas-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|svg)$/,// 匹配请求路径
            handler: 'CacheFirst',  // 网络优先，如果请求失败，使用缓存
            options: {
              cacheName: 'atlas-image-cache', // 固定名称，靠 expiration 控制缓存条目数量和过期
              expiration: {
                maxEntries: 100,  // 最大缓存数量
                maxAgeSeconds: 60 * 60 * 24 * 3, // 缓存3天
              },
            },
          },
        ],
        //预缓存是在Service Worker安装时执行的,会将指定的资源列表下载并存储在缓存中。
        // 这些资源在离线时可以直接从缓存中加载，无需再向服务器请求。
        globPatterns: [
          // 预缓存的资源类型
          '**/*.{html,css,js,ico}',
        ],
      },
    }),
  ],
  publicDir: 'public', // 静态资源目录
  // 服务器配置
  server: {
    host: '0.0.0.0',    
    port: 3000, // 调试启动端口
    open: true
  },
  // 构建配置
  build: {
    minify: 'terser', // 明确指定使用 terser 进行压缩
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console 语句
      },
    },
    target: 'esnext', // 目标输出环境
    outDir: '../../web/public/atlas', // 输出目录（构建到 web 静态资源目录）
    assetsDir: 'assets', // 静态资源目录
    assetsInlineLimit: 4096, // 小于这个大小的资源会被内联到base64中
    rollupOptions: {
      // 传递给Rollup的配置选项
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // 手动分块策略
        manualChunks: {
          // Element Plus 单独打包
          'element-plus': ['element-plus'],
          // Vue 生态单独打包
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // 工具库单独打包
          'utils': ['axios'],
        },
      },
    },
  },
  // 别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')  // 设置@符号为src目录
    }
  },
  define: {
    // 只暴露必要的环境变量，避免暴露所有系统环境变量
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})

