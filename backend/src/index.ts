import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { initDB } from './db'
import { authRouter } from './routes/auth'
import { postsRouter } from './routes/posts'
import { mediaRouter } from './routes/media'
import { adminRouter } from './routes/admin'
import pool from './db'

const app = new Hono()

// 미들웨어 설정
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // 프론트엔드 주소
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}))

// 기본 라우트
app.get('/', (c) => {
  return c.json({
    message: 'MorningDock API Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// 활동 로그 기록 (간이 엔드포인트)
app.post('/api/log', async (c) => {
  try {
    const { email, activity } = await c.req.json()
    if (!email || !activity) return c.json({ success: false }, 400)

    // 사용자 ID 조회 (이메일 기반)
    // 실제로는 토큰에서 ID를 가져오는 것이 안전하지만, 
    // 프론트엔드 요청 구조(activityLogger.ts)에 맞춰 이메일로 조회
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    const userId = userRes.rows[0]?.id

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId || null, activity, c.req.header('CF-Connecting-IP') || '127.0.0.1', c.req.header('User-Agent')]
    )

    return c.json({ success: true })
  } catch (err) {
    console.error('Log Error:', err)
    return c.json({ success: false }, 500)
  }
})

// 라우터 마운트
app.route('/api/auth', authRouter)
app.route('/api/posts', postsRouter)
app.route('/api/media', mediaRouter)
app.route('/api/admin', adminRouter)

// 에러 핸들링
app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  }, 500)
})

app.notFound((c) => {
  return c.json({
    success: false,
    message: 'Not Found'
  }, 404)
})

// 서버 시작
const port = parseInt(process.env.PORT || '8787')
console.log(`🚀 Server is running on port ${port}`)

// DB 초기화
initDB().catch(console.error)

serve({
  fetch: app.fetch,
  port
})

export default app