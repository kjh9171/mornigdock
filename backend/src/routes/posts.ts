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
    return c.json({ success: true, post: result.rows[0] }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── PUT /api/posts/:id ───
postsRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { title, content, category, pinned, source, source_url, related_video_url, related_audio_url } = body

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id])
    if (existing.rows.length === 0) return c.json({ success: false, message: '게시글 없음' }, 404)

    if (existing.rows[0].author_id !== parseInt(user.sub) && user.role !== 'admin') {
      return c.json({ success: false, message: '권한 없음' }, 403)
    }

    const result = await pool.query(
      `UPDATE posts SET title=COALESCE($1,title), content=COALESCE($2,content), category=COALESCE($3,category), 
       pinned=COALESCE($4,pinned), source=COALESCE($5,source), source_url=COALESCE($6,source_url),
       related_video_url=COALESCE($7,related_video_url), related_audio_url=COALESCE($8,related_audio_url)
       WHERE id=$9 RETURNING *`,
      [title, content, category, pinned, source, source_url, related_video_url, related_audio_url, id]
    )
    return c.json({ success: true, post: result.rows[0] })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── DELETE /api/posts/:id ───
postsRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any
    const id = parseInt(c.req.param('id'))
    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id])
    if (existing.rows.length === 0) return c.json({ success: false }, 404)
    if (existing.rows[0].author_id !== parseInt(user.sub) && user.role !== 'admin') return c.json({ success: false }, 403)
    await pool.query('DELETE FROM posts WHERE id = $1', [id])
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false }, 500) }
})

// ─── POST /api/posts/:id/comments ─── 댓글 작성 (404 해결용 복구)
postsRouter.post('/:id/comments', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any
    const postId = parseInt(c.req.param('id'))
    const { content, parent_id } = await c.req.json()

    if (!content?.trim()) return c.json({ success: false, message: '내용을 입력해주세요.' }, 400)

    const result = await pool.query(
      `INSERT INTO comments (post_id, parent_id, author_id, author_name, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [postId, parent_id || null, user.sub, user.username, content.trim()]
    )
    return c.json({ success: true, comment: result.rows[0] }, 201)
  } catch (err) {
    console.error('Comment Insert Error:', err)
    return c.json({ success: false, message: '댓글 작성 실패' }, 500)
  }
})
