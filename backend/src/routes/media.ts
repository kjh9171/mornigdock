import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const media = new Hono();

// ─── GET /media ──────────────────────────────────────────────────────────────
media.get('/', optionalAuth(), async (c) => {
  const type = c.req.query('type'); // youtube | podcast | music

  let sql = 'SELECT * FROM media WHERE is_active = true';
  const params: string[] = [];
  if (type) {
    sql += ' AND type = $1';
    params.push(type);
  }
  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// ─── POST /media ─────────────────────────────────────────────────────────────
media.post('/', requireAuth(['admin', 'editor']), async (c) => {
  const schema = z.object({
    type:        z.enum(['youtube', 'podcast', 'music']),
    title:       z.string().min(1).max(200),
    description: z.string().optional(),
    url:         z.string().url(),
    thumbnail:   z.string().url().optional(),
    duration:    z.number().int().positive().optional(),
  });
  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { type, title, description, url, thumbnail, duration } = parsed.data;
  const result = await query(
    `INSERT INTO media (type, title, description, url, thumbnail, duration)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [type, title, description ?? null, url, thumbnail ?? null, duration ?? null]
  );
  return c.json({ success: true, data: result.rows[0] }, 201);
});

// ─── PUT /media/:id ──────────────────────────────────────────────────────────
media.put('/:id', requireAuth(['admin', 'editor']), async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));

  const fields: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let idx = 1;

  if (body.title       !== undefined) { fields.push(`title = $${idx++}`);       params.push(body.title); }
  if (body.description !== undefined) { fields.push(`description = $${idx++}`); params.push(body.description); }
  if (body.url         !== undefined) { fields.push(`url = $${idx++}`);         params.push(body.url); }
  if (body.thumbnail   !== undefined) { fields.push(`thumbnail = $${idx++}`);   params.push(body.thumbnail); }
  if (body.is_active   !== undefined) { fields.push(`is_active = $${idx++}`);   params.push(body.is_active); }

  if (fields.length === 0) return c.json({ success: false, message: '수정할 내용이 없습니다.' }, 400);

  params.push(id);
  const result = await query(
    `UPDATE media SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ success: true, data: result.rows[0] });
});

// ─── DELETE /media/:id ───────────────────────────────────────────────────────
media.delete('/:id', requireAuth(['admin']), async (c) => {
  const id = Number(c.req.param('id'));
  const result = await query('DELETE FROM media WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ success: true, message: '삭제 완료' });
});

export default media;
