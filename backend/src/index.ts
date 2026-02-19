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
import { fetchNewsService } from './newsService'

const app = new Hono()

app.use('*', logger())

// 🔥 [긴급 수정] CORS 설정을 더 유연하게 변경하여 'Failed to fetch' 원천 봉쇄
app.use('*', cors({
  origin: (origin) => {
    // 모든 localhost 및 127.0.0.1 기반 접속 허용 (포트 무관)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    return 'http://localhost:5173'; // 기본값
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', (c) => c.json({ message: '아고라 API v1.0' }))

// 🔥 [기능] 활동 로그 기록 엔드포인트
app.post('/api/log', async (c) => {
  try {
    const { email, activity } = await c.req.json()
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    const userId = userRes.rows[0]?.id
    await pool.query(
      `INSERT INTO activity_logs (user_id, email, action, ip_address) VALUES ($1, $2, $3, $4)`,
      [userId || null, email, activity, c.req.header('x-forwarded-for') || '127.0.0.1']
    )
    return c.json({ success: true })
  } catch (e) {
    return c.json({ success: false }, 500)
  }
})

app.route('/api/auth', authRouter)
app.route('/api/posts', postsRouter)
app.route('/api/media', mediaRouter)
app.route('/api/admin', adminRouter)

const port = 8787
initDB().then(() => {
  console.log(`🚀 Server started on port ${port}`)
  
  // 🔥 [기능] 매 시간마다 뉴스 자동 추출 (Auto Fetch News Every Hour)
  setInterval(async () => {
    try {
      await fetchNewsService()
    } catch (e) {
      console.error('Auto Fetch News Error:', e)
    }
  }, 1000 * 60 * 60) // 1시간 간격

  // 서버 시작 시 수동 수집 한 번 실행
  fetchNewsService().catch(console.error)

  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
})

export default app
