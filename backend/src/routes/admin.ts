import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { fetchNewsService } from '../newsService'
import bcrypt from 'bcryptjs'

export const adminRouter = new Hono()

// 모든 관리자 라우트에 인증 및 권한 미들웨어 적용
adminRouter.use('*', authMiddleware)
adminRouter.use('*', adminMiddleware)

// 🔥 [로그 기록 함수] 관리자 활동을 기록합니다.
async function logAdminAction(c: any, action: string) {
  const user = c.get('user')
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
  await pool.query(
    `INSERT INTO activity_logs (user_id, email, action, ip_address) VALUES ($1, $2, $3, $4)`,
    [user.sub, user.email, `[ADMIN] ${action}`, ip]
  )
}

// ─── 유저 생성 ───
adminRouter.post('/users', async (c) => {
  try {
    const { email, username, password, role } = await c.req.json()
    const hashed = await bcrypt.hash(password || '123456', 10)
    const result = await pool.query(
      `INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role`,
      [email, username, hashed, role || 'user']
    )
    await logAdminAction(c, `Created user: ${email}`)
    return c.json({ success: true, user: result.rows[0] })
  } catch (err) { return c.json({ success: false, message: '유저 생성 실패' }, 500) }
})

// ─── 유저 삭제 ───
adminRouter.delete('/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [id])
    if (userRes.rows.length === 0) return c.json({ success: false }, 404)
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    await logAdminAction(c, `Deleted user: ${userRes.rows[0].email}`)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── 유저 수정 (역할/상태) ───
adminRouter.put('/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { role, is_active, username } = await c.req.json()
    const result = await pool.query(
      `UPDATE users SET role=COALESCE($1, role), is_active=COALESCE($2, is_active), username=COALESCE($3, username) 
       WHERE id=$4 RETURNING *`,
      [role, is_active, username, id]
    )
    await logAdminAction(c, `Updated user properties: ${result.rows[0].email}`)
    return c.json({ success: true, user: result.rows[0] })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ... (나머지 기존 뉴스 수집, 통계, 설정 등 로직 유지하며 로그 추가)

adminRouter.post('/fetch-news', async (c) => {
  await fetchNewsService()
  await logAdminAction(c, 'Triggered manual news intelligence fetch')
  return c.json({ success: true })
})

adminRouter.get('/config', async (c) => {
  const result = await pool.query('SELECT * FROM system_config')
  return c.json({ success: true, config: result.rows.reduce((acc: any, r: any) => ({...acc, [r.key]: r.value}), {}) })
})

adminRouter.get('/stats', async (c) => {
  const [u, p, m] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM posts'),
    pool.query('SELECT COUNT(*) FROM media')
  ])
  return c.json({ success: true, stats: { users: u.rows[0].count, posts: p.rows[0].count, media: m.rows[0].count } })
})

adminRouter.get('/users', async (c) => {
  const res = await pool.query('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id DESC')
  return c.json({ success: true, users: res.rows })
})

adminRouter.get('/posts', async (c) => {
  const res = await pool.query('SELECT id, type, category, title, author_name, pinned, view_count, created_at FROM posts ORDER BY id DESC')
  return c.json({ success: true, posts: res.rows })
})

adminRouter.get('/logs', async (c) => {
  const res = await pool.query('SELECT l.*, u.username FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.id DESC LIMIT 100')
  return c.json({ success: true, logs: res.rows })
})
