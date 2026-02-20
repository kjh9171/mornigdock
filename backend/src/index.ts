import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { initDB } from './db'
import { authRouter } from './routes/auth'
import { postsRouter } from './routes/posts'
import { mediaRouter } from './routes/media'
import { adminRouter } from './routes/admin'
import { stocksRouter } from './routes/stocks'
import pool from './db'
import { fetchNewsService } from './newsService'
import { fetchStockService } from './stockService'
import { logActivity } from './utils/logger'

const app = new Hono()

app.use('*', logger())

app.use('*', cors({
  origin: (origin) => {
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) return origin;
    return 'http://localhost:5173';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', (c) => c.json({ message: '아고라 API v1.0' }))

// 🔥 [긴급 추가] 프론트엔드 전용 활동 로그 엔드포인트
app.post('/api/log', async (c) => {
  try {
    const { email, action } = await c.req.json()
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    const userId = userRes.rows[0]?.id
    await logActivity(userId || null, email, action, c.req.header('x-forwarded-for') || '127.0.0.1')
    return c.json({ success: true })
  } catch (e) {
    return c.json({ success: false }, 500)
  }
})

app.route('/api/auth', authRouter)
app.route('/api/posts', postsRouter)
app.route('/api/media', mediaRouter)
app.route('/api/admin', adminRouter)
app.route('/api/stocks', stocksRouter)

const port = 8787
initDB().then(() => {
  console.log(`🚀 아고라 서버 기동 완료 (Port: ${port})`)
  
  // 1시간마다 뉴스 및 증시 수집 작전 수행
  setInterval(async () => {
    try {
      await fetchNewsService();
      await fetchStockService();
    } catch (e) {
      console.error('CRITICAL: 자동 수집 중 오류 발생', e);
    }
  }, 1000 * 60 * 60);

  // 초기 기동 시 즉시 수집
  fetchNewsService().catch(console.error);
  fetchStockService().catch(console.error);

  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
})

export default app
