import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // @vitejs/plugin-react 会向上解析到仓库根目录的 vite 6，其 Plugin 类型与
  // vitest 内置的 vite 5 互不兼容（两个 vite 实例各有一份 Plugin 定义）。
  // 运行时插件钩子完全一致，因此只在类型层做一次局部逃逸，不升级依赖。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  // 测试环境不需要真实 CSS 处理；内联空配置避免 vite 加载 postcss.config.mjs
  // （vitest 内置 vite 5.2.x 与 Tailwind CSS 4 的 @tailwindcss/postcss 不兼容，
  //  会在启动时抛出 "Invalid PostCSS Plugin found at: plugins[0]"）
  css: {
    postcss: {
      plugins: []
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
