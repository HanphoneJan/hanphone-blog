import path from 'path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  base: '/games/gomoku/',
  build: {
    outDir: path.resolve(__dirname, '../../web/public/games/gomoku'),
    emptyOutDir: true,
  },
  plugins: [
    uni(),
  ],
})
