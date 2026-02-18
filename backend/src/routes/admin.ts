import { Hono } from 'hono'
import pool from '../db'
import { adminMiddleware } from '../middleware/auth'

export const adminRouter = new Hono()

// 모든 관리자 라우트에 미들웨어 적용
adminRouter.use('*', adminMiddleware)

// ─── 대시보드 통계 ───
adminRouter.get('/stats', async (c) => {
  try {
    const [users, posts, comments, media, reportedComments] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM posts'),
      pool.query('SELECT COUNT(*) FROM comments WHERE is_deleted = false'),
      pool.query('SELECT COUNT(*) FROM media'),
      pool.query('SELECT COUNT(*) FROM comments WHERE reported = true AND is_deleted = false'),
    ])
    return c.json({
      success: true,
      stats: {
        users: parseInt(users.rows[0].count),
        posts: parseInt(posts.rows[0].count),
        comments: parseInt(comments.rows[0].count),
        media: parseInt(media.rows[0].count),
        reportedComments: parseInt(reportedComments.rows[0].count),
      },
    })
  } catch (err) {
    return c.json({ success: false, message: '통계 조회 실패' }, 500)
  }
})

// ─── 회원 목록 ───
adminRouter.get('/users', async (c) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    )
    return c.json({ success: true, users: result.rows })
  } catch (err) {
    return c.json({ success: false, message: '회원 조회 실패' }, 500)
  }
})

// ─── 회원 역할 변경 ───
adminRouter.put('/users/:id/role', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { role } = await c.req.json()
    if (!['user', 'editor', 'admin'].includes(role)) {
      return c.json({ success: false, message: '유효하지 않은 역할' }, 400)
    }
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role, is_active',
      [role, id]
    )
    return c.json({ success: true, user: result.rows[0] })
  } catch (err) {
    return c.json({ success: false, message: '역할 변경 실패' }, 500)
  }
})

// ─── 회원 활성/차단 토글 ───
adminRouter.put('/users/:id/toggle', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, username, is_active',
      [id]
    )
    return c.json({ success: true, user: result.rows[0] })
  } catch (err) {
    return c.json({ success: false, message: '상태 변경 실패' }, 500)
  }
})

// ─── 관리자 게시글 목록 (전체) ───
adminRouter.get('/posts', async (c) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.type, p.category, p.title, p.author_name, p.pinned,
              p.view_count, p.created_at,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = false) AS comment_count
       FROM posts p ORDER BY p.created_at DESC LIMIT 100`
    )
    return c.json({ success: true, posts: result.rows })
  } catch (err) {
    return c.json({ success: false, message: '게시글 조회 실패' }, 500)
  }
})

// ─── 게시글 고정/해제 ───
adminRouter.put('/posts/:id/pin', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const result = await pool.query(
      'UPDATE posts SET pinned = NOT pinned WHERE id = $1 RETURNING id, title, pinned',
      [id]
    )
    return c.json({ success: true, post: result.rows[0] })
  } catch (err) {
    return c.json({ success: false, message: '고정 변경 실패' }, 500)
  }
})

// ─── 게시글 삭제 ───
adminRouter.delete('/posts/:id', async (c) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [parseInt(c.req.param('id'))])
    return c.json({ success: true })
  } catch (err) {
    return c.json({ success: false, message: '삭제 실패' }, 500)
  }
})

// ─── 전체 댓글 목록 (신고순) ───
adminRouter.get('/comments', async (c) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.post_id, c.parent_id, c.author_name, c.content,
              c.reported, c.is_deleted, c.created_at,
              p.title AS post_title
       FROM comments c
       LEFT JOIN posts p ON c.post_id = p.id
       ORDER BY c.reported DESC, c.created_at DESC
       LIMIT 100`
    )
    return c.json({ success: true, comments: result.rows })
  } catch (err) {
    return c.json({ success: false, message: '댓글 조회 실패' }, 500)
  }
})

// ─── 댓글 삭제 ───
adminRouter.delete('/comments/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await pool.query('UPDATE comments SET is_deleted = true, content = $1 WHERE id = $2', ['[삭제된 댓글입니다]', id])
    return c.json({ success: true })
  } catch (err) {
    return c.json({ success: false, message: '삭제 실패' }, 500)
  }
})

// ─── 활동 로그 ───
adminRouter.get('/logs', async (c) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.username FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC LIMIT 200`
    )
    return c.json({ success: true, logs: result.rows })
  } catch (err) {
    return c.json({ success: false, message: '로그 조회 실패' }, 500)
  }
})