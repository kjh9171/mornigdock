import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─────────────────────────────────────────────────────────────────────────────
// Vite 설정: Docker 환경 및 백엔드 프록시 최적화
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  server: {
    // Docker 컨테이너 외부(호스트 OS)에서 접근할 수 있도록 허용
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 프론트엔드의 /api로 시작하는 요청을 백엔드 컨테이너로 전달
      '/api': {
        // docker-compose.yml에 정의된 서비스 명 'backend' 사용
        target: 'http://backend:8787',
        changeOrigin: true,
        // 백엔드 서버가 /api 접두사 없이 라우팅을 처리하는 경우를 위해 경로 재작성
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})