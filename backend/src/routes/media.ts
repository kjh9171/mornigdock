import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

export const mediaRouter = new Hono()

// GET /api/media?type=youtube
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
    return c.json({ success: false, message: '미디어 조회 실패' }, 500)
  }
})

// POST /api/media (관리자)
mediaRouter.post('/', adminMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { type, title, description, url, thumbnail_url, author, category, duration } = body
    if (!type || !title || !url) return c.json({ success: false, message: '필수 필드 누락' }, 400)
    const result = await pool.query(
      `INSERT INTO media (type, title, description, url, thumbnail_url, author, category, duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [type, title, description, url, thumbnail_url, author, category, duration]
    )
    return c.json({ success: true, media: result.rows[0] }, 201)
  } catch (err) {
    return c.json({ success: false, message: '미디어 추가 실패' }, 500)
  }
})

// PUT /api/media/:id (관리자)
mediaRouter.put('/:id', adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { type, title, description, url, thumbnail_url, author, category, duration, is_active } = body
    const result = await pool.query(
      `UPDATE media SET type=COALESCE($1,type), title=COALESCE($2,title), description=COALESCE($3,description),
       url=COALESCE($4,url), thumbnail_url=COALESCE($5,thumbnail_url), author=COALESCE($6,author),
       category=COALESCE($7,category), duration=COALESCE($8,duration), is_active=COALESCE($9,is_active),
       updated_at=NOW() WHERE id=$10 RETURNING *`,
      [type, title, description, url, thumbnail_url, author, category, duration, is_active, id]
    )
    return c.json({ success: true, media: result.rows[0] })
  } catch (err) {
    return c.json({ success: false, message: '미디어 수정 실패' }, 500)
  }
})

// DELETE /api/media/:id (관리자)
mediaRouter.delete('/:id', adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await pool.query('DELETE FROM media WHERE id = $1', [id])
    return c.json({ success: true, message: '삭제되었습니다.' })
  } catch (err) {
    return c.json({ success: false, message: '삭제 실패' }, 500)
  }
})