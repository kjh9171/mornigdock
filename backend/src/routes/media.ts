import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.ts';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';

const media = new Hono();

// ─── GET /media (활성화된 미디어만 조회) ─────────────────────────────────────────
media.get('/', optionalAuth(), async (c) => {
  const type = c.req.query('type'); 

  let sql = 'SELECT * FROM media WHERE is_active = true';
  const params: any[] = [];
  
  if (type) {
    sql += ' AND type = $1';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  return c.json({ success: true, data: result.rows });
});

// ─── POST /media/request (관리자에게 음악 신청 문의글 남기기) ────────────────────────
media.post('/request', requireAuth(), async (c) => {
  const user = c.get('user'); // JwtPayload { userId, ... }
  const schema = z.object({
    title: z.string().min(1).max(200),
    url:   z.string().url(),
    content: z.string().optional(),
  });
  
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.errors[0].message }, 400);

  const { title, url, content } = parsed.data;
  
  // inquiries 테이블에 'music_request' 타입으로 문의글 등록
  const result = await query(
    `INSERT INTO inquiries (user_id, type, title, content)
     VALUES ($1, 'music_request', $2, $3) RETURNING *`,
    [user.userId, title, `URL: ${url}\n${content || ''}`]
  );

  return c.json({ 
    success: true, 
    message: '관리자에게 음악 신청 문의가 전송되었습니다. 검토 후 리스트에 추가됩니다.', 
    data: result.rows[0] 
  });
});

export default media;
