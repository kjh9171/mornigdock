import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { initDB } from './db'
import { authRouter } from './routes/auth'
import { postsRouter } from './routes/posts'
import { mediaRouter } from './routes/media'
import { adminRouter } from './routes/admin'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:80',
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRouter)
app.route('/api/posts', postsRouter)
app.route('/api/media', mediaRouter)
app.route('/api/admin', adminRouter)

app.notFound((c) => c.json({ success: false, message: '경로를 찾을 수 없습니다.' }, 404))
app.onError((err, c) => {
  console.error('[서버 오류]', err)
  return c.json({ success: false, message: '서버 내부 오류', error: err.message }, 500)
})

const port = parseInt(process.env.PORT || '8787')

async function main() {
  try {
    await initDB()
    console.log('✅ DB 초기화 완료')
  } catch (err) {
    console.error('❌ DB 초기화 실패:', err)
  }
  console.log(`🚀 서버 실행 중: http://0.0.0.0:${port}`)
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
}

main()
export default app