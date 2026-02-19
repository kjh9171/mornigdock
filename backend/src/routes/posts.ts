import { Hono } from 'hono'
import pool from '../db'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import { logActivity } from '../utils/logger'

export const postsRouter = new Hono()

// ─── GET /api/posts ───
postsRouter.get('/', optionalAuth, async (c) => {
  try {
    const type = c.req.query('type')
    const category = c.req.query('category')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    let conditions = []
    let params: any[] = []

    if (type) {
      params.push(type)
      conditions.push(`p.type = $${params.length}`)
    }

    if (category && category !== '전체' && category !== '뉴스 분석') {
      params.push(category)
      conditions.push(`p.category = $${params.length}`)
    }

    if (category === '뉴스 분석') {
      params = ['news']
      conditions = [`p.type = $1`]
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(`SELECT COUNT(*) FROM posts p ${whereClause}`, params)
    const total = parseInt(countResult.rows[0].count)

    params.push(limit, offset)
    const result = await pool.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = false) AS comment_count
       FROM posts p
       ${whereClause}
       ORDER BY p.pinned DESC, p.updated_at DESC, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return c.json({
      success: true,
      posts: result.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})

// ─── GET /api/posts/:id ───
postsRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const user = c.get('user')
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id])
    const result = await pool.query(`SELECT * FROM posts WHERE id = $1`, [id])
    if (result.rows.length === 0) return c.json({ success: false }, 404)
    
    // 🔥 조회 로그 기록
    await logActivity(user?.sub || null, user?.email || 'GUEST', `지능물 조회: ${result.rows[0].title}`, c.req.header('x-forwarded-for'))

    const comments = await pool.query(
      `SELECT id, post_id, parent_id, author_name, content, is_deleted, created_at
       FROM comments WHERE post_id = $1 ORDER BY created_at ASC`,
      [id]
    )
    return c.json({ success: true, post: result.rows[0], comments: comments.rows })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})

// ─── POST /api/posts ───
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
    
    await logActivity(user.sub, user.email, `게시글 작성: ${title}`, c.req.header('x-forwarded-for'))
    
    return c.json({ success: true, post: result.rows[0] }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── POST /api/posts/:id/comments ───
postsRouter.post('/:id/comments', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any
    const postId = parseInt(c.req.param('id'))
    const { content, parent_id } = await c.req.json()

    const result = await pool.query(
      `INSERT INTO comments (post_id, parent_id, author_id, author_name, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [postId, parent_id || null, user.sub, user.username, content.trim()]
    )
    
    await pool.query('UPDATE posts SET updated_at = NOW() WHERE id = $1', [postId])
    await logActivity(user.sub, user.email, `토론 참여(댓글): ${content.substring(0, 20)}...`, c.req.header('x-forwarded-for'))
    
    return c.json({ success: true, comment: result.rows[0] }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})
