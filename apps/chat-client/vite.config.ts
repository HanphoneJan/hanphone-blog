import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const port = parseInt(env.VITE_PORT) || 4011;

  return {
    plugins: [react()],
    base: '/chat/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: port,
      proxy: {
        '/api': {
          target: env.VITE_SOCKET_URL || 'http://localhost:4010',
          changeOrigin: true
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            utils: ['axios', 'socket.io-client', 'md5'],
            ui: ['framer-motion', 'lucide-react'],
          },
        },
      },
    },
  };
})
