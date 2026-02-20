import { Hono } from 'hono'
import { query } from '../db/pool.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

export const postsRouter = new Hono()

// ─── GET /api/posts ───
postsRouter.get('/', optionalAuth(), async (c) => {
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

    if (category && category !== '전체' && category !== 'all') {
      params.push(category)
      conditions.push(`p.category = $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await query(`SELECT COUNT(*) FROM posts p ${whereClause}`, params)
    const total = parseInt(countResult.rows[0].count)

    const dataParams = [...params, limit, offset]
    const result = await query(
      `SELECT p.*,
              p.user_id as author_id,
              u.name as author_name,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = false) AS comment_count
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )

    return c.json({
      success: true,
      posts: result.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('Board Fetch Error:', err)
    return c.json({ success: false }, 500)
  }
})

// ─── GET /api/posts/:id ───
postsRouter.get('/:id', optionalAuth(), async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id])
    const result = await query(
      `SELECT p.*, u.name as author_name, p.user_id as author_id 
       FROM posts p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`, 
      [id]
    )
    if (result.rows.length === 0) return c.json({ success: false }, 404)
    
    const comments = await query(
      `SELECT c.*, u.name as author_name 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = $1 AND c.is_deleted = false 
       ORDER BY c.created_at ASC`,
      [id]
    )
    return c.json({ success: true, post: result.rows[0], comments: comments.rows })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})

// ─── POST /api/posts ───
postsRouter.post('/', requireAuth(), async (c) => {
  try {
    const user = c.get('user') as any
    const body = await c.req.json()
    const { type = 'post', category, title, content } = body
    const result = await query(
      `INSERT INTO posts (type, category, title, content, user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [type, category || 'general', title, content, user.userId]
    )
    return c.json({ success: true, post: { ...result.rows[0], author_name: user.name, author_id: user.userId } }, 201)
  } catch (err) { 
    console.error('Post Create Error:', err)
    return c.json({ success: false }, 500) 
  }
})

// ─── DELETE /api/posts/:id ───
postsRouter.delete('/:id', requireAuth(), async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const user = c.get('user') as any
    
    const postRes = await query('SELECT user_id FROM posts WHERE id = $1', [id])
    if (postRes.rows.length === 0) return c.json({ success: false, message: 'Not Found' }, 404)
    
    if (user.role !== 'admin' && postRes.rows[0].user_id !== user.userId) {
      return c.json({ success: false, message: 'Unauthorized' }, 403)
    }

    await query('DELETE FROM posts WHERE id = $1', [id])
    return c.json({ success: true })
  } catch (err) { 
    return c.json({ success: false }, 500) 
  }
})

export default postsRouter;
