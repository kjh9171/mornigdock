import { Hono } from 'hono';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { checkDbConnection } from '../db/pool.js';

const admin = new Hono();
const adminOnly  = requireAuth(['admin']);
const editorOnly = requireAuth(['admin', 'editor']);

// ─── GET /admin/dashboard ────────────────────────────────────────────────────
admin.get('/dashboard', adminOnly, async (c) => {
  const [users, news, comments, media] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM news'),
    query('SELECT COUNT(*) FROM comments WHERE is_deleted = false'),
    query('SELECT COUNT(*) FROM media WHERE is_active = true'),
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
      },
      recentLogs: recentLogs.rows,
      system: { dbConnected: dbOk, uptime: process.uptime() },
    },
  });
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

  // 본인 차단 방지
  const self = c.get('user');
  if (self.userId === id) {
    return c.json({ success: false, message: '본인 계정을 차단할 수 없습니다.' }, 400);
  }

  await query('UPDATE users SET is_blocked = $1 WHERE id = $2', [blocked, id]);
  // 차단 시 refresh token 전부 삭제
  if (blocked) {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
  }
  return c.json({ success: true, message: blocked ? '차단 완료' : '차단 해제 완료' });
});

// ─── PUT /admin/users/:id/role ───────────────────────────────────────────────
admin.put('/users/:id/role', adminOnly, async (c) => {
  const id   = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const role = body.role;

  if (!['admin', 'editor', 'user'].includes(role)) {
    return c.json({ success: false, message: '유효하지 않은 역할입니다.' }, 400);
  }
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
  return c.json({ success: true, message: `역할이 ${role}로 변경되었습니다.` });
});

// ─── GET /admin/logs ─────────────────────────────────────────────────────────
admin.get('/logs', adminOnly, async (c) => {
  const page  = Math.max(1, Number(c.req.query('page')  ?? 1));
  const limit = Math.min(100, Number(c.req.query('limit') ?? 50));
  const offset = (page - 1) * limit;

  const total = await query('SELECT COUNT(*) FROM access_logs');
  const result = await query(
    `SELECT al.*, u.name AS user_name
     FROM access_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return c.json({
    success: true,
    data: {
      items: result.rows,
      pagination: {
        page, limit,
        total: Number(total.rows[0].count),
        totalPages: Math.ceil(Number(total.rows[0].count) / limit),
      },
    },
  });
});

// ─── GET /admin/settings ──────────────────────────────────────────────────────
admin.get('/settings', adminOnly, async (c) => {
  const result = await query('SELECT key, value FROM system_settings ORDER BY key');
  const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
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

export default admin;
