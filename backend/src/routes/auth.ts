import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { query, transaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

// ESM/CJS 하이브리드 환경을 위한 무적의 authenticator 추출 로직
const authenticator = (otplib as any).authenticator ?? (otplib as any).default?.authenticator ?? (otplib as any).default;

const auth = new Hono();

const JWT_SECRET          = process.env.JWT_SECRET          ?? 'fallback_secret';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  ?? 'fallback_refresh';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      ?? '15m';
const JWT_REFRESH_EXP     = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
const MASTER_OTP          = process.env.MASTER_OTP_CODE     ?? '000000';

function generateTokens(userId: number, email: string, role: string) {
  const payload = { userId, email, role };
  const accessToken  = jwt.sign(payload, JWT_SECRET,         { expiresIn: JWT_EXPIRES_IN as any });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXP as any });
  return { accessToken, refreshToken };
}

async function saveRefreshToken(userId: number, token: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt.toISOString()]
  );
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
auth.post('/register', async (c) => {
  try {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(8, '비밀번호는 최소 8자 이상'),
      name:     z.string().min(1).max(50),
    });
    const body = await c.req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
    }
    const { email, password, name } = parsed.data;

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if ((exists.rowCount ?? 0) > 0) {
      return c.json({ success: false, message: '이미 사용 중인 이메일입니다.' }, 409);
    }

    const hash = await bcrypt.hash(password, 12);
    const otpSecret = authenticator.generateSecret();

    const result = await query(
      `INSERT INTO users (email, password, name, otp_secret)
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, role`,
      [email, hash, name, otpSecret]
    );
    const user = result.rows[0];

    const otpUrl = authenticator.keyuri(email, 'Agora', otpSecret);
    let qrCode = '';
    try {
      qrCode = await QRCode.toDataURL(otpUrl);
    } catch (qrErr) {
      console.error('[Auth] QR Code Generation Error:', qrErr);
    }

    return c.json({
      success: true,
      message: '회원가입 완료. OTP를 설정하세요.',
      data: { user, qrCode, otpSecret },
    }, 201);
  } catch (err: any) {
    console.error('[Auth] Register Error:', err);
    return c.json({ success: false, message: '서버 내부 오류가 발생했습니다.' }, 500);
  }
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
auth.post('/login', async (c) => {
  const schema = z.object({
    email:    z.string().email(),
    password: z.string(),
    otpCode:  z.string().optional(),
  });
  const body = await c.req.json().catch(() => null);
  console.log(`[Auth] Login attempt: ${body?.email}`);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: '입력값을 확인하세요.' }, 400);
  }
  const { email, password, otpCode } = parsed.data;

  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const user = result.rows[0];

  if (user.is_blocked) {
    return c.json({ success: false, message: '차단된 계정입니다. 관리자에게 문의하세요.' }, 403);
  }

  const validPw = await bcrypt.compare(password, user.password);
  if (!validPw) {
    return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  // OTP 검증 (활성화된 경우)
  if (user.otp_enabled) {
    if (!otpCode) {
      return c.json({ success: false, message: 'OTP 코드가 필요합니다.', requireOtp: true }, 200);
    }
    const isMaster = otpCode === MASTER_OTP;
    const isValid  = user.otp_secret
      ? authenticator.check(otpCode, user.otp_secret)
      : false;

    if (!isMaster && !isValid) {
      return c.json({ success: false, message: 'OTP 코드가 올바르지 않습니다.' }, 401);
    }
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  await saveRefreshToken(user.id, refreshToken);
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  // 접속 로그
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
  const ua = c.req.header('user-agent') ?? '';
  await query(
    'INSERT INTO access_logs (user_id, email, ip_address, user_agent, action) VALUES ($1,$2,$3,$4,$5)',
    [user.id, user.email, ip, ua, 'login']
  ).catch(() => {});

  return c.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
auth.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = body?.refreshToken;
  if (!token) {
    return c.json({ success: false, message: 'Refresh token이 필요합니다.' }, 400);
  }

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    const stored = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if ((stored.rowCount ?? 0) === 0) {
      return c.json({ success: false, message: '만료된 refresh token입니다.' }, 401);
    }

    // 기존 토큰 삭제 후 새 발급 (Rotation)
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    const { accessToken, refreshToken: newRefresh } = generateTokens(
      payload.userId, payload.email, payload.role
    );
    await saveRefreshToken(payload.userId, newRefresh);

    return c.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    return c.json({ success: false, message: '유효하지 않은 refresh token입니다.' }, 401);
  }
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
auth.post('/logout', requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (body.refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [body.refreshToken]).catch(() => {});
  }
  return c.json({ success: true, message: '로그아웃 완료' });
});

// ─── POST /auth/otp/enable ───────────────────────────────────────────────────
auth.post('/otp/enable', requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => null);
  const code = body?.code;
  if (!code) return c.json({ success: false, message: 'OTP 코드가 필요합니다.' }, 400);

  const user = c.get('user');
  const result = await query('SELECT otp_secret FROM users WHERE id = $1', [user.userId]);
  const { otp_secret } = result.rows[0];

  const isMaster = code === MASTER_OTP;
  const isValid  = otp_secret ? authenticator.check(code, otp_secret) : false;
  if (!isMaster && !isValid) {
    return c.json({ success: false, message: 'OTP 코드가 올바르지 않습니다.' }, 400);
  }

  await query('UPDATE users SET otp_enabled = true WHERE id = $1', [user.userId]);
  return c.json({ success: true, message: 'OTP 2단계 인증이 활성화되었습니다.' });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
auth.get('/me', requireAuth(), async (c) => {
  const { userId } = c.get('user');
  const result = await query(
    'SELECT id, email, name, role, otp_enabled, last_login, created_at FROM users WHERE id = $1',
    [userId]
  );
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ success: true, data: result.rows[0] });
});

// ─── PUT /auth/password ──────────────────────────────────────────────────────
auth.put('/password', requireAuth(), async (c) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword:     z.string().min(8),
  });
  const body   = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.errors[0].message }, 400);
  }

  const { userId } = c.get('user');
  const result = await query('SELECT password FROM users WHERE id = $1', [userId]);
  const valid  = await bcrypt.compare(parsed.data.currentPassword, result.rows[0].password);
  if (!valid) {
    return c.json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' }, 400);
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
  // 모든 refresh token 무효화
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  return c.json({ success: true, message: '비밀번호가 변경되었습니다. 다시 로그인하세요.' });
});

export default auth;
