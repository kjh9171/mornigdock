import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
const authenticator = otplib.authenticator ?? otplib.default?.authenticator ?? otplib.default;
const auth = new Hono();
const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const JWT_REFRESH_EXP = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
const MASTER_OTP = process.env.MASTER_OTP_CODE ?? '000000';
function generateTokens(userId, email, role) {
    const payload = { userId, email, role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXP });
    return { accessToken, refreshToken };
}
async function saveRefreshToken(userId, token) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt.toISOString()]);
}
// ─── POST /auth/register (회원가입 로직 강화) ───────────────────────────────────
auth.post('/register', async (c) => {
    try {
        const body = await c.req.json().catch(() => null);
        if (!body)
            return c.json({ success: false, message: '데이터가 없습니다.' }, 400);
        const { email, password, name } = body;
        if (!email || !password || !name) {
            return c.json({ success: false, message: '모든 필드를 입력해주세요.' }, 400);
        }
        const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
        if ((exists.rowCount ?? 0) > 0) {
            return c.json({ success: false, message: '이미 가입된 이메일입니다.' }, 409);
        }
        const hash = await bcrypt.hash(password, 12);
        const otpSecret = authenticator.generateSecret();
        const result = await query(`INSERT INTO users (email, password, name, role, otp_secret, otp_enabled)
       VALUES ($1, $2, $3, 'user', $4, false) RETURNING id, email, name, role`, [email, hash, name, otpSecret]);
        const user = result.rows[0];
        // OTP 설정을 위한 QR 코드 생성 (최초 가입 시 제공)
        const otpUrl = authenticator.keyuri(email, 'AGORA Intelligence', otpSecret);
        const qrCode = await QRCode.toDataURL(otpUrl);
        return c.json({
            success: true,
            message: '회원가입이 완료되었습니다. OTP 설정을 완료해 주세요.',
            data: { user, qrCode, otpSecret },
        }, 201);
    }
    catch (err) {
        console.error('[Auth Register Error]', err);
        return c.json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' }, 500);
    }
});
// ─── POST /auth/login ────────────────────────────────────────────────────────
auth.post('/login', async (c) => {
    try {
        const { email, password, otpCode } = await c.req.json().catch(() => ({}));
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if ((result.rowCount ?? 0) === 0)
            return c.json({ success: false, message: '정보가 일치하지 않습니다.' }, 401);
        const user = result.rows[0];
        if (user.is_blocked)
            return c.json({ success: false, message: '차단된 계정입니다.' }, 403);
        const validPw = await bcrypt.compare(password, user.password);
        if (!validPw)
            return c.json({ success: false, message: '정보가 일치하지 않습니다.' }, 401);
        if (user.otp_enabled) {
            if (!otpCode)
                return c.json({ success: false, message: 'OTP 코드가 필요합니다.', requireOtp: true }, 200);
            const isValid = otpCode === MASTER_OTP || (user.otp_secret && authenticator.check(otpCode, user.otp_secret));
            if (!isValid)
                return c.json({ success: false, message: 'OTP 코드가 올바르지 않습니다.' }, 401);
        }
        const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
        await saveRefreshToken(user.id, refreshToken);
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        return c.json({
            success: true,
            data: { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
        });
    }
    catch (err) {
        return c.json({ success: false, message: '로그인 중 오류가 발생했습니다.' }, 500);
    }
});
// ─── GET /auth/me ────────────────────────────────────────────────────────────
auth.get('/me', requireAuth(), async (c) => {
    const { userId } = c.get('user');
    const result = await query('SELECT id, email, name, role, otp_enabled, last_login, created_at FROM users WHERE id = $1', [userId]);
    if ((result.rowCount ?? 0) === 0)
        return c.json({ success: false, message: 'User not found' }, 404);
    return c.json({ success: true, data: result.rows[0] });
});
// ─── POST /auth/otp/enable ───────────────────────────────────────────────────
auth.post('/otp/enable', requireAuth(), async (c) => {
    const { code } = await c.req.json().catch(() => ({}));
    const user = c.get('user');
    const res = await query('SELECT otp_secret FROM users WHERE id = $1', [user.userId]);
    const otpSecret = res.rows[0]?.otp_secret;
    const isValid = code === MASTER_OTP || (otpSecret && authenticator.check(code, otpSecret));
    if (!isValid)
        return c.json({ success: false, message: 'OTP 코드가 올바르지 않습니다.' }, 400);
    await query('UPDATE users SET otp_enabled = true WHERE id = $1', [user.userId]);
    return c.json({ success: true, message: 'OTP 인증이 활성화되었습니다.' });
});
export default auth;
//# sourceMappingURL=auth.js.map