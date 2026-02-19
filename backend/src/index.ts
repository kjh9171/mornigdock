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

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', (c) => c.json({ message: 'MorningDock API v1.0' }))

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
  serve({ fetch: app.fetch, port })
})

export default app
