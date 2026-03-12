import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { checkDbConnection } from '../db/pool.js';
import { getSystemSettings } from '../utils/settings.js';
import bcrypt from 'bcryptjs';

const admin = new Hono();
const adminOnly  = requireAuth(['admin']);          // 관리자 전용
const editorOnly = requireAuth(['admin', 'editor']); // 에디터 이상

// ─── GET /admin/dashboard ──────────────────────────────────────────────────
admin.get('/dashboard', adminOnly, async (c) => {
  // inquiries 테이블 포함 모든 통계를 한번에 집계
  const [users, news, comments, media, inquiries] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM news'),
    query('SELECT COUNT(*) FROM comments WHERE is_deleted = false'),
    query('SELECT COUNT(*) FROM media WHERE is_active = true'),
    query("SELECT COUNT(*) FROM inquiries WHERE status = 'pending'"),
  ]);

  // 최근 접속 로그 20건 조회
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
        totalUsers:       Number(users.rows[0].count),
        totalNews:        Number(news.rows[0].count),
        totalComments:    Number(comments.rows[0].count),
        totalMedia:       Number(media.rows[0].count),
        pendingInquiries: Number(inquiries.rows[0].count),
      },
      recentLogs: recentLogs.rows,
      system: { dbConnected: dbOk, uptime: process.uptime() },
    },
  });
});

// ─── GET /admin/inquiries (문의글 목록) ───────────────────────────────────
admin.get('/inquiries', adminOnly, async (c) => {
  const result = await query(
    `SELECT i.*, u.name as user_name, u.email as user_email
     FROM inquiries i
     LEFT JOIN users u ON i.user_id = u.id
     ORDER BY i.created_at DESC`
  );
  return c.json({ success: true, data: result.rows });
});

// ─── PUT /admin/inquiries/:id (문의글 상태 변경) ──────────────────────────
admin.put('/inquiries/:id', adminOnly, async (c) => {
  const id = Number(c.req.param('id'));
  const { status } = await c.req.json();
  await query('UPDATE inquiries SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  return c.json({ success: true, message: '문의 상태가 업데이트되었습니다.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── 사용자 관리 (CRUD 완전체) ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/users - 전체 사용자 목록 조회
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

// POST /admin/users - 새 사용자 추가
admin.post('/users', adminOnly, async (c) => {
  const schema = z.object({
    email:    z.string().email('유효한 이메일이 필요합니다.'),
    name:     z.string().min(1, '이름이 필요합니다.').max(100),
    password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
    role:     z.enum(['admin', 'editor', 'user']).default('user'),
  });

  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { email, name, password, role } = parsed.data;

  // 이미 존재하는 이메일 확인
  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rowCount && exists.rowCount > 0) {
    return c.json({ success: false, message: '이미 사용 중인 이메일입니다.' }, 409);
  }

  // 비밀번호 해시화
  const hashed = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (email, name, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, is_blocked, created_at`,
    [email, name, hashed, role]
  );

  return c.json({ success: true, data: result.rows[0], message: '사용자가 추가되었습니다.' }, 201);
});

// PUT /admin/users/:id - 사용자 정보 및 권한 수정
admin.put('/users/:id', adminOnly, async (c) => {
  const id   = Number(c.req.param('id'));
  const self = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { name, role, is_blocked, password } = body;

  // 본인이 자기 역할을 낮출 수 없는 보호 로직
  if (self.userId === id && role && role !== 'admin') {
    return c.json({ success: false, message: '본인의 권한을 강등할 수 없습니다.' }, 400);
  }

  // 동적으로 업데이트할 필드 구성
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];

  if (name !== undefined) {
    params.push(name);
    setClauses.push(`name = $${params.length}`);
  }
  if (role !== undefined) {
    params.push(role);
    setClauses.push(`role = $${params.length}`);
  }
  if (is_blocked !== undefined) {
    params.push(Boolean(is_blocked));
    setClauses.push(`is_blocked = $${params.length}`);
    // 차단 시 해당 유저의 리프레시 토큰 모두 삭제
    if (Boolean(is_blocked)) {
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }
  }
  if (password) {
    const hashed = await bcrypt.hash(password, 12);
    params.push(hashed);
    setClauses.push(`password = $${params.length}`);
  }

  params.push(id);
  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
    params
  );

  return c.json({ success: true, message: '사용자 정보가 수정되었습니다.' });
});

// PUT /admin/users/:id/block - 차단/차단해제 (기존 호환성 유지)
admin.put('/users/:id/block', adminOnly, async (c) => {
  const id      = Number(c.req.param('id'));
  const body    = await c.req.json().catch(() => ({}));
  const blocked = Boolean(body.blocked);
  const self    = c.get('user');

  if (self.userId === id) {
    return c.json({ success: false, message: '본인 계정을 차단할 수 없습니다.' }, 400);
  }

  await query('UPDATE users SET is_blocked = $1, updated_at = NOW() WHERE id = $2', [blocked, id]);
  if (blocked) {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
  }
  return c.json({ success: true, message: blocked ? '차단 완료' : '차단 해제 완료' });
});

// DELETE /admin/users/:id - 사용자 삭제
admin.delete('/users/:id', adminOnly, async (c) => {
  const id   = Number(c.req.param('id'));
  const self = c.get('user');

  if (self.userId === id) {
    return c.json({ success: false, message: '본인 계정을 삭제할 수 없습니다.' }, 400);
  }

  // 대상 유저 확인
  const target = await query('SELECT id, role FROM users WHERE id = $1', [id]);
  if (!target.rowCount || target.rowCount === 0) {
    return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404);
  }

  // 관리자 계정 보호: 다른 관리자도 삭제 가능하지만 마지막 admin은 보호
  if (target.rows[0].role === 'admin') {
    const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (Number(adminCount.rows[0].count) <= 1) {
      return c.json({ success: false, message: '마지막 관리자 계정은 삭제할 수 없습니다.' }, 400);
    }
  }

  await query('DELETE FROM users WHERE id = $1', [id]);
  return c.json({ success: true, message: '사용자가 삭제되었습니다.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── 미디어 관리 (CRUD 완전체 + YouTube/팟캐스트/음악) ─────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/media - 전체 미디어 목록
admin.get('/media', adminOnly, async (c) => {
  const result = await query('SELECT * FROM media ORDER BY created_at DESC');
  return c.json({ success: true, data: result.rows });
});

// POST /admin/media - 미디어 추가 (YouTube / 팟캐스트 / 음악)
admin.post('/media', adminOnly, async (c) => {
  const schema = z.object({
    title:       z.string().min(1, '제목이 필요합니다.').max(200),
    type:        z.enum(['youtube', 'podcast', 'music']),
    url:         z.string().url('올바른 URL이 필요합니다.'),
    description: z.string().optional(),
    thumbnail:   z.string().optional(),
    artist:      z.string().optional(),
    is_featured: z.boolean().optional().default(false),
    is_active:   z.boolean().optional().default(true),
  });

  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { title, type, url, description, thumbnail, artist, is_featured, is_active } = parsed.data;

  // YouTube URL에서 자동으로 썸네일 추출
  let autoThumbnail = thumbnail;
  if (!autoThumbnail && (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be'))) {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      autoThumbnail = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
  }

  const res = await query(
    `INSERT INTO media (title, type, url, description, thumbnail, artist, is_featured, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
    [title, type, url, description || '', autoThumbnail || '', artist || '', is_featured, is_active]
  );
  return c.json({ success: true, data: res.rows[0], message: '미디어가 추가되었습니다.' }, 201);
});

// PUT /admin/media/:id - 미디어 수정
admin.put('/media/:id', editorOnly, async (c) => {
  const id     = Number(c.req.param('id'));
  const schema = z.object({
    title:       z.string().min(1).max(200).optional(),
    type:        z.enum(['youtube', 'podcast', 'music']).optional(),
    url:         z.string().url().optional(),
    description: z.string().optional(),
    thumbnail:   z.string().optional(),
    artist:      z.string().optional(),
    is_featured: z.boolean().optional(),
    is_active:   z.boolean().optional(),
  });

  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const updates = parsed.data;
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];

  Object.entries(updates).forEach(([key, val]) => {
    if (val !== undefined) {
      params.push(val);
      setClauses.push(`${key} = $${params.length}`);
    }
  });

  if (params.length === 0) {
    return c.json({ success: false, message: '수정할 내용이 없습니다.' }, 400);
  }

  params.push(id);
  const result = await query(
    `UPDATE media SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  if (!result.rowCount || result.rowCount === 0) {
    return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  }

  return c.json({ success: true, data: result.rows[0], message: '미디어가 수정되었습니다.' });
});

// DELETE /admin/media/:id - 미디어 삭제
admin.delete('/media/:id', editorOnly, async (c) => {
  const id = Number(c.req.param('id'));
  const result = await query('DELETE FROM media WHERE id = $1 RETURNING id', [id]);

  if (!result.rowCount || result.rowCount === 0) {
    return c.json({ success: false, message: '미디어를 찾을 수 없습니다.' }, 404);
  }

  return c.json({ success: true, message: '미디어가 삭제되었습니다.' });
});

// ─── GET /admin/settings ──────────────────────────────────────────────────
admin.get('/settings', adminOnly, async (c) => {
  const settings = await getSystemSettings([
    'naver_client_id', 'naver_client_secret', 'gemini_api_key',
    'ai_analysis_enabled', 'auto_fetch_enabled', 'maintenance_mode',
    'max_news_per_fetch', 'news_fetch_interval'
  ]);
  return c.json({ success: true, data: settings });
});

// ─── PUT /admin/settings ──────────────────────────────────────────────────
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

// ─── GET /admin/news ──────────────────────────────────────────────────────
admin.get('/news', adminOnly, async (c) => {
  const result = await query('SELECT * FROM news ORDER BY published_at DESC LIMIT 100');
  return c.json({ success: true, data: result.rows });
});

// ─── GET /admin/posts ─────────────────────────────────────────────────────
admin.get('/posts', adminOnly, async (c) => {
  const result = await query(
    `SELECT p.*, u.name as author_name
     FROM posts p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC LIMIT 100`
  );
  return c.json({ success: true, data: result.rows });
});

// ─── POST /admin/system/migrate - DB 스키마 긴급 동기화 ─────────────────
admin.post('/system/migrate', adminOnly, async (c) => {
  try {
    // 1. media 테이블 play_count 추가
    await query('ALTER TABLE media ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0');
    // 2. inquiries 테이블 type 추가
    await query('ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT \'general\'');
    // 3. inquiries 테이블 status 제약조건 확인 (rejected 추가 등)
    // 기존 체크 제약조건 때문에 ERROR가 날 수 있으므로 컬럼 추가 위주로 진행
    
    return c.json({ success: true, message: '데이터베이스 스키마 동기화가 완료되었습니다.' });
  } catch (err: any) {
    console.error('[Migration] Failed:', err.message);
    return c.json({ success: false, message: `동기화 실패: ${err.message}` }, 500);
  }
});

export default admin;
