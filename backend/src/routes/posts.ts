import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, optionalAuth } from '../middleware/auth'

export const postsRouter = new Hono()

// ─── GET /api/posts ───
postsRouter.get('/', optionalAuth, async (c) => {
  try {
    const type = c.req.query('type') || 'board'
    const category = c.req.query('category')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    let whereClause = 'WHERE p.type = $1'
    const params: any[] = [type]

    if (category && category !== '전체') {
      whereClause += ` AND p.category = $${params.length + 1}`
      params.push(category)
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM posts p ${whereClause}`, params)
    const total = parseInt(countResult.rows[0].count)

    params.push(limit, offset)
    const result = await pool.query(
      `SELECT p.id, p.type, p.category, p.title, p.author_name, p.pinned,
              p.view_count, p.source, p.source_url, p.related_video_url, p.related_audio_url, p.created_at,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = false) AS comment_count
       FROM posts p
       ${whereClause}
       ORDER BY p.pinned DESC, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return c.json({
      success: true,
      posts: result.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return c.json({ success: false, message: '조회 실패' }, 500)
  }
})

// ─── GET /api/posts/:id ───
postsRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id])
    const result = await pool.query(`SELECT * FROM posts WHERE id = $1`, [id])
    if (result.rows.length === 0) return c.json({ success: false, message: '게시글 없음' }, 404)
    const comments = await pool.query(
      `SELECT id, post_id, parent_id, author_name, content, is_deleted, created_at
       FROM comments WHERE post_id = $1 ORDER BY created_at ASC`,
      [id]
    )
    return c.json({ success: true, post: result.rows[0], comments: comments.rows })
  } catch (err) {
    return c.json({ success: false, message: '조회 실패' }, 500)
  }
})

// ... (나머지 POST, PUT, DELETE 등은 기존 로직 유지)
postsRouter.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any
    const body = await c.req.json()
    const { type = 'board', category, title, content, source, source_url, related_video_url, related_audio_url } = body
    const result = await pool.query(
      `INSERT INTO posts (type, category, title, content, author_id, author_name, source, source_url, related_video_url, related_audio_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [type, category || '자유', title, content, user.sub, user.username, source, source_url, related_video_url, related_audio_url]
    )
    return c.json({ success: true, post: result.rows[0] }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})
