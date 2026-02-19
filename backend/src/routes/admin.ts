import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { fetchNewsService } from '../newsService'
import bcrypt from 'bcryptjs'

export const adminRouter = new Hono()

// 모든 관리자 라우트에 인증 및 권한 미들웨어 적용
adminRouter.use('*', authMiddleware)
adminRouter.use('*', adminMiddleware)

async function logAdminAction(c: any, action: string) {
  const user = c.get('user')
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
  await pool.query(
    `INSERT INTO activity_logs (user_id, email, action, ip_address) VALUES ($1, $2, $3, $4)`,
    [user.sub, user.email, `[ADMIN] ${action}`, ip]
  )
}

// ─── 지능 즉시 수집 (신설/복구) ───
adminRouter.post('/fetch-news', async (c) => {
  try {
    console.log('📡 ADMIN: Triggering manual intelligence gathering...')
    await fetchNewsService()
    await logAdminAction(c, '지능 즉시 수집 실행')
    return c.json({ success: true, message: '지능 수집 완료' })
  } catch (err) {
    console.error('❌ ADMIN FETCH ERROR:', err)
    return c.json({ success: false, message: '수집 실패' }, 500)
  }
})

// ─── 요원 (Users) 관리 ───
adminRouter.get('/users', async (c) => {
  try {
    const res = await pool.query('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id DESC')
    console.log(`📡 ADMIN: Retrieved ${res.rows.length} agents.`)
    return c.json({ success: true, users: res.rows })
  } catch (err) {
    return c.json({ success: false, message: '요원 명단 확보 실패' }, 500)
  }
})

// ─── 지능 분석물 (Posts) 관리 ───
adminRouter.get('/posts', async (c) => {
  try {
    const res = await pool.query('SELECT * FROM posts ORDER BY id DESC')
    return c.json({ success: true, posts: res.rows })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})

adminRouter.post('/posts', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { type, category, title, content, source, source_url } = body
    const result = await pool.query(
      `INSERT INTO posts (type, category, title, content, author_id, author_name, source, source_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [type || 'news', category, title, content, user.sub, user.username, source || '사령부 HQ', source_url]
    )
    await logAdminAction(c, `지능 분석물 생성: ${title}`)
    return c.json({ success: true, post: result.rows[0] })
  } catch (err) { return c.json({ success: false }, 500) }
})

adminRouter.delete('/posts/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const postRes = await pool.query('SELECT title FROM posts WHERE id = $1', [id])
    if (postRes.rows.length === 0) return c.json({ success: false }, 404)
    await pool.query('DELETE FROM posts WHERE id = $1', [id])
    await logAdminAction(c, `지능 분석물 삭제: ${postRes.rows[0].title}`)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── 시스템 설정 ───
adminRouter.get('/config', async (c) => {
  const result = await pool.query('SELECT * FROM system_config')
  const config = result.rows.reduce((acc: any, r: any) => ({...acc, [r.key]: r.value}), {})
  return c.json({ success: true, config })
})

adminRouter.put('/config', async (c) => {
  const { key, value } = await c.req.json()
  await pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, String(value)])
  await logAdminAction(c, `시스템 설정 변경: ${key}=${value}`)
  return c.json({ success: true })
})

// ─── 대시보드 통계 ───
adminRouter.get('/stats', async (c) => {
  const [u, p, m] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM posts'),
    pool.query('SELECT COUNT(*) FROM media')
  ])
  return c.json({ success: true, stats: { users: u.rows[0].count, posts: p.rows[0].count, media: m.rows[0].count } })
})

adminRouter.get('/logs', async (c) => {
  const res = await pool.query('SELECT l.*, u.username FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.id DESC LIMIT 100')
  return c.json({ success: true, logs: res.rows })
})
