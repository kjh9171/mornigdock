import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

export const mediaRouter = new Hono()

// 활동 로그 기록을 위한 헬퍼 (관리자 활동 추적용)
async function logMediaAction(c: any, action: string) {
  const user = c.get('user')
  if (!user) return
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
  await pool.query(
    `INSERT INTO activity_logs (user_id, email, action, ip_address) VALUES ($1, $2, $3, $4)`,
    [user.sub, user.email, `[MEDIA] ${action}`, ip]
  )
}

// GET /api/media
mediaRouter.get('/', async (c) => {
  try {
    const type = c.req.query('type')
    let query = 'SELECT * FROM media WHERE is_active = true'
    const params: any[] = []
    if (type) { query += ' AND type = $1'; params.push(type) }
    query += ' ORDER BY created_at DESC'
    const result = await pool.query(query, params)
    return c.json({ success: true, media: result.rows })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})

// POST /api/media (관리자 전용 + 로그 기록)
mediaRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { type, title, description, url, author, category, duration } = body
    const result = await pool.query(
      `INSERT INTO media (type, title, description, url, author, category, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [type, title, description, url, author, category, duration]
    )
    await logMediaAction(c, `Added media asset: ${title}`)
    return c.json({ success: true, media: result.rows[0] }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})

// PUT /api/media/:id (관리자 전용 + 로그 기록)
mediaRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { type, title, description, url, author, category, duration, is_active } = body
    const result = await pool.query(
      `UPDATE media SET type=COALESCE($1,type), title=COALESCE($2,title), description=COALESCE($3,description),
       url=COALESCE($4,url), author=COALESCE($5,author), category=COALESCE($6,category), 
       duration=COALESCE($7,duration), is_active=COALESCE($8,is_active), updated_at=NOW() 
       WHERE id=$9 RETURNING *`,
      [type, title, description, url, author, category, duration, is_active, id]
    )
    await logMediaAction(c, `Modified media asset: ${title}`)
    return c.json({ success: true, media: result.rows[0] })
  } catch (err) { return c.json({ success: false }, 500) }
})

// DELETE /api/media/:id (관리자 전용 + 로그 기록)
mediaRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const mediaRes = await pool.query('SELECT title FROM media WHERE id = $1', [id])
    if (mediaRes.rows.length === 0) return c.json({ success: false }, 404)
    await pool.query('DELETE FROM media WHERE id = $1', [id])
    await logMediaAction(c, `Purged media asset: ${mediaRes.rows[0].title}`)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false }, 500) }
})
