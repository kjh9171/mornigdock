import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { authRouter } from './routes/auth'
import { serve } from '@hono/node-server'

// ✅ Hono 앱 인스턴스 생성
const app = new Hono()

// ✅ 공통 미들웨어 설정
app.use('*', logger())
app.use('*', prettyJSON())

// ✅ CORS 설정 - 프론트엔드 주소를 허용 (로그인/회원가입 오류의 주요 원인)
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',  // Vite 기본 포트
      'http://localhost:3000',
      'http://frontend:5173',   // Docker 내부 네트워크
      process.env.FRONTEND_URL || 'http://localhost:5173',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// ✅ 헬스체크 엔드포인트
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ✅ 인증 라우터 등록 (/api/auth/...)
app.route('/api/auth', authRouter)

// ✅ 404 처리
app.notFound((c) => {
  return c.json({ success: false, message: '요청한 경로를 찾을 수 없습니다.' }, 404)
})

// ✅ 전역 에러 처리
app.onError((err, c) => {
  console.error('[서버 오류]', err)
  return c.json(
    { success: false, message: '서버 내부 오류가 발생했습니다.', error: err.message },
    500
  )
})

// ✅ 서버 시작 (Docker에서 0.0.0.0으로 바인딩 필수)
const port = parseInt(process.env.PORT || '8787')
console.log(`🚀 서버 실행 중: http://0.0.0.0:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

export default app