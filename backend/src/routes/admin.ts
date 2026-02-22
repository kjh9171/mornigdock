import { Hono } from 'hono';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { checkDbConnection } from '../db/pool.js';
import { getSystemSettings } from '../utils/settings.js';

const admin = new Hono();
const adminOnly  = requireAuth(['admin']);
const editorOnly = requireAuth(['admin', 'editor']);

// ─── GET /admin/dashboard ────────────────────────────────────────────────────
admin.get('/dashboard', adminOnly, async (c) => {
  const [users, news, comments, media, inquiries] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM news'),
    query('SELECT COUNT(*) FROM comments WHERE is_deleted = false'),
    query('SELECT COUNT(*) FROM media WHERE is_active = true'),
    query('SELECT COUNT(*) FROM inquiries WHERE status = \'pending\''),
  ]);

  const recentLogs = await query(
    `SELECT al.*, u.name AS user_name
     FROM access_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT 20`
  );

  const dbOk = await checkDbConnection();

  return c.json({
    success: true,
    data: {
      stats: {
        totalUsers:    Number(users.rows[0].count),
        totalNews:     Number(news.rows[0].count),
        totalComments: Number(comments.rows[0].count),
        totalMedia:    Number(media.rows[0].count),
        pendingInquiries: Number(inquiries.rows[0].count),
      },
      recentLogs: recentLogs.rows,
      system: { dbConnected: dbOk, uptime: process.uptime() },
    },
  });
});

// ─── GET /admin/inquiries (문의글 목록) ────────────────────────────────────────
admin.get('/inquiries', adminOnly, async (c) => {
  const result = await query(
    `SELECT i.*, u.name as user_name, u.email as user_email 
     FROM inquiries i 
     JOIN users u ON i.user_id = u.id 
     ORDER BY i.created_at DESC`
  );
  return c.json({ success: true, data: result.rows });
});

// ─── PUT /admin/inquiries/:id (문의글 상태 변경) ─────────────────────────────────
admin.put('/inquiries/:id', adminOnly, async (c) => {
  const id = Number(c.req.param('id'));
  const { status } = await c.req.json();
  await query('UPDATE inquiries SET status = $1 WHERE id = $2', [status, id]);
  return c.json({ success: true, message: '문의 상태가 업데이트되었습니다.' });
});

// ─── GET /admin/users ────────────────────────────────────────────────────────
admin.get('/users', adminOnly, async (c) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.is_blocked, u.otp_enabled,
            u.last_login, u.created_at,
            (SELECT COUNT(*) FROM access_logs al WHERE al.user_id = u.id) AS login_count
     FROM users u
     ORDER BY u.created_at DESC`
  );
  return c.json({ success: true, data: result.rows });
});

// ─── PUT /admin/users/:id/block ──────────────────────────────────────────────
admin.put('/users/:id/block', adminOnly, async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const blocked = Boolean(body.blocked);

  const self = c.get('user');
  if (self.userId === id) {
    return c.json({ success: false, message: '본인 계정을 차단할 수 없습니다.' }, 400);
  }

  await query('UPDATE users SET is_blocked = $1 WHERE id = $2', [blocked, id]);
  if (blocked) await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
  return c.json({ success: true, message: blocked ? '차단 완료' : '차단 해제 완료' });
});

// ─── GET /admin/settings ──────────────────────────────────────────────────────
admin.get('/settings', adminOnly, async (c) => {
  // 환경 변수 기반 설정값도 함께 전달
  const settings = await getSystemSettings([
    'naver_client_id', 'naver_client_secret', 'gemini_api_key',
    'ai_analysis_enabled', 'auto_fetch_enabled', 'maintenance_mode',
    'max_news_per_fetch', 'news_fetch_interval'
  ]);
  return c.json({ success: true, data: settings });
});

// ─── PUT /admin/settings ──────────────────────────────────────────────────────
admin.put('/settings', adminOnly, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ success: false, message: '설정값이 필요합니다.' }, 400);
  }

  const entries = Object.entries(body);
  await Promise.all(
    entries.map(([key, value]) =>
      query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      )
    )
  );
  return c.json({ success: true, message: '설정이 저장되었습니다.' });
});

// ─── GET /admin/news ──────────────────────────────────────────────────────────
admin.get('/news', adminOnly, async (c) => {
  const result = await query('SELECT * FROM news ORDER BY published_at DESC');
  return c.json({ success: true, data: result.rows });
});

// ─── GET /admin/posts ─────────────────────────────────────────────────────────
admin.get('/posts', adminOnly, async (c) => {
  const result = await query('SELECT * FROM posts ORDER BY created_at DESC');
  return c.json({ success: true, data: result.rows });
});

// ─── DELETE /admin/media/:id ──────────────────────────────────────────────────
admin.delete('/media/:id', editorOnly, async (c) => {
  const id = Number(c.req.param('id'));
  await query('DELETE FROM media WHERE id = $1', [id]);
  return c.json({ success: true, message: '미디어가 삭제되었습니다.' });
});

// 미디어 관리 (조회/추가)
admin.get('/media', adminOnly, async (c) => {
  const result = await query('SELECT * FROM media ORDER BY created_at DESC');
  return c.json({ success: true, data: result.rows });
});

admin.post('/media', adminOnly, async (c) => {
  const { title, type, url, description, thumbnail, is_featured } = await c.req.json();
  const res = await query(
    `INSERT INTO media (title, type, url, description, thumbnail, is_featured, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING *`,
    [title, type, url, description, thumbnail, is_featured || false]
  );
  return c.json({ success: true, data: res.rows[0] });
});

export default admin;
