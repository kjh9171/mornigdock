import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const comments = new Hono();

// ─── GET /comments?newsId=:id ────────────────────────────────────────────────
comments.get('/', optionalAuth(), async (c) => {
  const newsId = c.req.query('newsId');
  const postId = c.req.query('postId');

  if (!newsId && !postId) {
    return c.json({ success: false, message: 'newsId 또는 postId가 필요합니다.' }, 400);
  }

  const whereClause = newsId
    ? 'WHERE c.news_id = $1 AND c.is_deleted = false'
    : 'WHERE c.post_id = $1 AND c.is_deleted = false';
  const idValue = newsId ?? postId;

  const result = await query(
    `SELECT c.id, c.parent_id, c.content, c.created_at, c.updated_at,
            u.id AS user_id, u.name AS user_name, u.role AS user_role
     FROM comments c
     JOIN users u ON u.id = c.user_id
     ${whereClause}
     ORDER BY c.created_at ASC`,
    [idValue]
  );

  // 계층형 트리 구성
  const flat = result.rows;
  const tree = buildTree(flat);

  return c.json({ success: true, data: tree });
});

function buildTree(items: any[]): any[] {
  const map: Record<number, any> = {};
  const roots: any[] = [];

  items.forEach((item) => {
    map[item.id] = { ...item, replies: [] };
  });
  items.forEach((item) => {
    if (item.parent_id) {
      map[item.parent_id]?.replies.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });
  return roots;
}

// ─── POST /comments ──────────────────────────────────────────────────────────
comments.post('/', requireAuth(), async (c) => {
  const schema = z.object({
    newsId:   z.number().optional(),
    postId:   z.number().optional(),
    parentId: z.number().optional(),
    content:  z.string().min(1).max(2000),
  });
  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { newsId, postId, parentId, content } = parsed.data;
  if (!newsId && !postId) {
    return c.json({ success: false, message: 'newsId 또는 postId가 필요합니다.' }, 400);
  }

  const { userId } = c.get('user');

  // 부모 댓글 존재 확인
  if (parentId) {
    const parent = await query('SELECT id FROM comments WHERE id = $1', [parentId]);
    if ((parent.rowCount ?? 0) === 0) {
      return c.json({ success: false, message: '부모 댓글을 찾을 수 없습니다.' }, 404);
    }
  }

  const result = await query(
    `INSERT INTO comments (news_id, post_id, user_id, parent_id, content)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, content, parent_id, created_at`,
    [newsId ?? null, postId ?? null, userId, parentId ?? null, content]
  );

  const userInfo = await query('SELECT name, role FROM users WHERE id = $1', [userId]);
  const comment = {
    ...result.rows[0],
    user_id: userId,
    user_name: userInfo.rows[0].name,
    user_role: userInfo.rows[0].role,
    replies: [],
  };

  return c.json({ success: true, data: comment }, 201);
});

// ─── PUT /comments/:id ───────────────────────────────────────────────────────
comments.put('/:id', requireAuth(), async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const content = body?.content?.trim();
  if (!content) return c.json({ success: false, message: '내용이 필요합니다.' }, 400);

  const { userId, role } = c.get('user');
  const result = await query('SELECT user_id FROM comments WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '댓글을 찾을 수 없습니다.' }, 404);
  }
  if (result.rows[0].user_id !== userId && role !== 'admin') {
    return c.json({ success: false, message: '수정 권한이 없습니다.' }, 403);
  }

  await query(
    'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2',
    [content, id]
  );
  return c.json({ success: true, message: '댓글이 수정되었습니다.' });
});

// ─── DELETE /comments/:id ────────────────────────────────────────────────────
comments.delete('/:id', requireAuth(), async (c) => {
  const id = Number(c.req.param('id'));
  const { userId, role } = c.get('user');

  const result = await query('SELECT user_id FROM comments WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '댓글을 찾을 수 없습니다.' }, 404);
  }
  if (result.rows[0].user_id !== userId && role !== 'admin') {
    return c.json({ success: false, message: '삭제 권한이 없습니다.' }, 403);
  }

  // Soft delete
  await query('UPDATE comments SET is_deleted = true, content = \'삭제된 댓글입니다.\' WHERE id = $1', [id]);
  return c.json({ success: true, message: '댓글이 삭제되었습니다.' });
});

export default comments;
