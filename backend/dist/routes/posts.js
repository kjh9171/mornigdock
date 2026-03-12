import { Hono } from 'hono';
import { query } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
export const postsRouter = new Hono();
// ─── GET /api/posts (검색 및 필터링 보강) ───
postsRouter.get('/', optionalAuth(), async (c) => {
    try {
        const type = c.req.query('type');
        const category = c.req.query('category');
        const search = c.req.query('search');
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '20');
        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];
        if (type) {
            params.push(type);
            conditions.push(`p.type = $${params.length}`);
        }
        if (category && category !== '전체' && category !== 'all') {
            params.push(category);
            conditions.push(`p.category = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // ─── 보안 계층: 비공개 글 처리 ───
        const user = c.get('user');
        const isAdmin = user?.role === 'admin';
        let securityCondition = '';
        if (!isAdmin) {
            // 관리자가 아니면 무조건 비공개 글은 제외합니다.
            securityCondition = whereClause
                ? ' AND p.is_private = false'
                : ' WHERE p.is_private = false';
        }
        const finalWhereClause = whereClause + securityCondition;
        const countResult = await query(`SELECT COUNT(*) as count FROM posts p ${finalWhereClause}`, params);
        const total = parseInt(countResult.rows[0].count || '0');
        const dataParams = [...params, limit, offset];
        const result = await query(`SELECT p.*,
              p.user_id as author_id,
              u.name as author_name,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = false) AS comment_count
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       ${finalWhereClause}
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`, dataParams);
        return c.json({
            success: true,
            posts: result.rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        return c.json({ success: false }, 500);
    }
});
// ─── GET /api/posts/:id (ID 파싱 보강) ───
postsRouter.get('/:id', optionalAuth(), async (c) => {
    const idStr = c.req.param('id') || ''; // undefined 방지
    const id = parseInt(idStr);
    if (isNaN(id))
        return c.json({ success: false, message: 'Invalid ID' }, 400);
    try {
        await query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id]);
        const result = await query(`SELECT p.*, u.name as author_name, p.user_id as author_id 
       FROM posts p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`, [id]);
        if (result.rows.length === 0)
            return c.json({ success: false }, 404);
        const comments = await query(`SELECT c.*, u.name as author_name 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = $1 AND c.is_deleted = false 
       ORDER BY c.created_at ASC`, [id]);
        return c.json({ success: true, post: result.rows[0], comments: comments.rows });
    }
    catch (err) {
        return c.json({ success: false }, 500);
    }
});
// ─── POST /api/posts/:id/reaction (좋아요/싫어요) ───
postsRouter.post('/:id/reaction', requireAuth(), async (c) => {
    const idStr = c.req.param('id') || ''; // undefined 방지
    const id = parseInt(idStr);
    if (isNaN(id))
        return c.json({ success: false, message: 'Invalid ID' }, 400);
    const user = c.get('user');
    const { reaction } = await c.req.json();
    if (!['like', 'dislike'].includes(reaction))
        return c.json({ success: false, message: 'Invalid reaction' }, 400);
    try {
        await query(`INSERT INTO reactions (user_id, target_type, target_id, reaction)
       VALUES ($1, 'post', $2, $3)
       ON CONFLICT (user_id, target_type, target_id) 
       DO UPDATE SET reaction = EXCLUDED.reaction`, [user.userId, id, reaction]);
        await query(`
      UPDATE posts SET 
        likes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'post' AND target_id = $1 AND reaction = 'like'),
        dislikes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'post' AND target_id = $1 AND reaction = 'dislike')
      WHERE id = $1
    `, [id]);
        const updated = await query('SELECT likes_count, dislikes_count FROM posts WHERE id = $1', [id]);
        return c.json({ success: true, data: updated.rows[0] });
    }
    catch (err) {
        return c.json({ success: false, message: err.message }, 500);
    }
});
// ─── POST /api/posts ───
postsRouter.post('/', requireAuth(), async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        const { type = 'post', category, title, content } = body;
        const result = await query(`INSERT INTO posts (type, category, title, content, user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`, [type, category || 'general', title, content, user.userId]);
        return c.json({ success: true, post: { ...result.rows[0], author_name: user.name, author_id: user.userId } }, 201);
    }
    catch (err) {
        return c.json({ success: false }, 500);
    }
});
export default postsRouter;
//# sourceMappingURL=posts.js.map