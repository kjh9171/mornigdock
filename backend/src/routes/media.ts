import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.ts';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';

const media = new Hono();

// ─── GET /media ──────────────────────────────────────────────────────────────
media.get('/', optionalAuth(), async (c) => {
  const type = c.req.query('type'); // youtube | podcast | music
  const user = c.get('user');

  let sql = `
    SELECT m.*, u.name as requester_name 
    FROM media m 
    LEFT JOIN users u ON m.requester_id = u.id 
    WHERE m.is_active = true
  `;
  const params: any[] = [];
  
  if (type) {
    sql += ' AND m.type = $1';
    params.push(type);
  }
  
  // 관리자는 승인 대기 중인 항목도 볼 수 있음
  if (user?.role === 'admin' || user?.role === 'editor') {
    sql = sql.replace('WHERE m.is_active = true', 'WHERE 1=1');
  }

  sql += ' ORDER BY m.created_at DESC';

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// ─── POST /media (관리자용: 즉시 추가) ──────────────────────────────────────────
media.post('/', requireAuth(['admin', 'editor']), async (c) => {
  const schema = z.object({
    type:        z.enum(['youtube', 'podcast', 'music']),
    title:       z.string().min(1).max(200),
    description: z.string().optional(),
    url:         z.string().url(),
    thumbnail:   z.string().url().optional(),
    duration:    z.number().int().positive().optional(),
    is_featured: z.boolean().optional(),
  });
  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { type, title, description, url, thumbnail, duration, is_featured } = parsed.data;
  const result = await query(
    `INSERT INTO media (type, title, description, url, thumbnail, duration, is_featured, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7, true) RETURNING *`,
    [type, title, description ?? null, url, thumbnail ?? null, duration ?? null, is_featured ?? false]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

// ─── POST /media/request (일반 유저용: 음악 신청) ───────────────────────────────
media.post('/request', requireAuth(['user', 'admin', 'editor']), async (c) => {
  const user = c.get('user'); // JwtPayload { userId, ... }
  const schema = z.object({
    title: z.string().min(1).max(200),
    url:   z.string().url(),
    type:  z.enum(['youtube', 'podcast', 'music']).default('music'),
  });
  
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.errors[0].message }, 400);

  const { title, url, type } = parsed.data;
  
  const result = await query(
    `INSERT INTO media (title, url, type, requester_id, is_active)
     VALUES ($1, $2, $3, $4, false) RETURNING *`,
    [title, url, type, user.userId]
  );

  return c.json({ success: true, message: '음악 신청이 완료되었습니다. 관리자 승인 후 리스트에 추가됩니다.', data: result.rows[0] });
});

// ─── PUT /media/:id (승인 및 수정) ────────────────────────────────────────────
media.put('/:id', requireAuth(['admin', 'editor']), async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));

  const fields: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let idx = 1;

  const allowedFields = ['title', 'description', 'url', 'thumbnail', 'is_active', 'is_featured', 'type'];
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      params.push(body[field]);
    }
  }

  if (fields.length === 0) return c.json({ success: false, message: '수정할 내용이 없습니다.' }, 400);

  params.push(id);
  const result = await query(
    `UPDATE media SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  
  if ((result.rowCount ?? 0) === 0) return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  return c.json({ success: true, data: result.rows[0] });
});

// ─── DELETE /media/:id ───────────────────────────────────────────────────────
media.delete('/:id', requireAuth(['admin']), async (c) => {
  const id = Number(c.req.param('id'));
  const result = await query('DELETE FROM media WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  return c.json({ success: true, message: '삭제 완료' });
});

export default media;
