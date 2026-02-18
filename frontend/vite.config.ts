import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Docker 환경에서 외부 접근 허용을 위해 host: true 설정
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // ← Docker에서 필수 (없으면 컨테이너 밖에서 접근 불가)
    port: 5173,
    // ✅ 백엔드 API 프록시 설정 (CORS 우회 가능)
    proxy: {
      '/api': {
        target: 'http://backend:8787',  // Docker 내부 서비스명 사용
        changeOrigin: true,
      },
    },
  },
})