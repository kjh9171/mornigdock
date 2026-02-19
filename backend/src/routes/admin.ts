import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { fetchNewsService } from '../newsService'
import bcrypt from 'bcryptjs'

export const adminRouter = new Hono()

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

// ─── 지능 분석물 (Posts) 관리 ───

// [조회]
adminRouter.get('/posts', async (c) => {
  const res = await pool.query('SELECT * FROM posts ORDER BY id DESC')
  return c.json({ success: true, posts: res.rows })
})

// [생성] - 🔥 연동 오류 수정
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
  } catch (err) { 
    console.error(err)
    return c.json({ success: false, message: '생성 실패' }, 500) 
  }
})

// [삭제] - 🔥 연동 오류 수정
adminRouter.delete('/posts/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const postRes = await pool.query('SELECT title FROM posts WHERE id = $1', [id])
    if (postRes.rows.length === 0) return c.json({ success: false, message: '대상 없음' }, 404)
    
    await pool.query('DELETE FROM posts WHERE id = $1', [id])
    await logAdminAction(c, `지능 분석물 삭제: ${postRes.rows[0].title}`)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── 요원 (Users) 관리 ───

adminRouter.get('/users', async (c) => {
  const res = await pool.query('SELECT id, email, username, role, is_active, created_at FROM users ORDER BY id DESC')
  return c.json({ success: true, users: res.rows })
})

adminRouter.post('/users', async (c) => {
  const { email, username, password, role } = await c.req.json()
  const hashed = await bcrypt.hash(password || '123456', 10)
  const result = await pool.query(
    `INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role`,
    [email, username, hashed, role || 'user']
  )
  await logAdminAction(c, `요원 생성: ${email}`)
  return c.json({ success: true, user: result.rows[0] })
})

adminRouter.delete('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const res = await pool.query('SELECT email FROM users WHERE id = $1', [id])
  await pool.query('DELETE FROM users WHERE id = $1', [id])
  await logAdminAction(c, `요원 영구 제명: ${res.rows[0]?.email}`)
  return c.json({ success: true })
})

// ─── 기타 통제 ───

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
