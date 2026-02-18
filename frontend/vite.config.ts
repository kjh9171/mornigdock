import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // ✅ Docker에서 외부 접근 허용 필수
    host: '0.0.0.0',
    port: 5173,
    // ✅ /api 요청을 백엔드로 프록시 (CORS 문제 해결)
    // Docker Compose 내부 서비스명 'backend'로 연결
    proxy: {
      '/api': {
        target: 'http://backend:8787',
        changeOrigin: true,
      },
    },
  },
})