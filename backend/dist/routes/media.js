import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
const media = new Hono();
// ─── GET /media (활성화된 미디어 목록 조회 + 타입 필터) ───────────────────
media.get('/', optionalAuth(), async (c) => {
    const type = c.req.query('type'); // youtube | podcast | music
    const search = c.req.query('search'); // 검색어
    let sql = 'SELECT * FROM media WHERE is_active = true';
    const params = [];
    // 타입 필터 적용
    if (type && ['youtube', 'podcast', 'music'].includes(type)) {
        params.push(type);
        sql += ` AND type = $${params.length}`;
    }
    // 검색어 필터 적용
    if (search) {
        params.push(`%${search}%`);
        sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR artist ILIKE $${params.length})`;
    }
    sql += ' ORDER BY is_featured DESC, play_count DESC, created_at DESC';
    const result = await query(sql, params);
    return c.json({ success: true, data: result.rows });
});
// ─── POST /media/:id/play (재생 횟수 카운트 업) ───────────────────────────
media.post('/:id/play', optionalAuth(), async (c) => {
    const id = Number(c.req.param('id'));
    if (isNaN(id))
        return c.json({ success: false, message: 'Invalid ID' }, 400);
    // 재생 횟수 1 증가
    await query('UPDATE media SET play_count = play_count + 1 WHERE id = $1', [id]);
    const result = await query('SELECT play_count FROM media WHERE id = $1', [id]);
    return c.json({ success: true, play_count: result.rows[0]?.play_count || 0 });
});
// ─── POST /media/request (유저 → 관리자 음악 신청) ────────────────────────
media.post('/request', requireAuth(), async (c) => {
    const user = c.get('user');
    const schema = z.object({
        title: z.string().min(1).max(200),
        url: z.string().url(),
        content: z.string().optional(),
    });
    const body = await c.req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
    }
    const { title, url, content } = parsed.data;
    // inquiries 테이블에 'music_request' 타입으로 등록
    const result = await query(`INSERT INTO inquiries (user_id, type, title, content)
     VALUES ($1, 'music_request', $2, $3) RETURNING *`, [user.userId, title, `URL: ${url}\n${content || ''}`]);
    return c.json({
        success: true,
        message: '음악 신청이 완료되었습니다. 관리자 검토 후 추가됩니다.',
        data: result.rows[0]
    }, 201);
});
export default media;
//# sourceMappingURL=media.js.map