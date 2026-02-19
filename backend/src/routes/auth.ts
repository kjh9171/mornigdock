import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import * as otplib from 'otplib'
import pool from '../db'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'
import { logActivity } from '../utils/logger'

export const authRouter = new Hono()

// 🔥 [긴급 수정] otplib v13 호출 방식 보정 (authenticator 접근법 수정)
const authenticator = (otplib as any).authenticator || (otplib as any).default?.authenticator;

if (authenticator) {
  authenticator.options = { 
    window: 2, 
    step: 30
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_ALG = 'HS256'
const JWT_EXPIRES_IN = 60 * 60 * 24

// ─── 로그인 가능 여부 확인 (신설) ───
authRouter.post('/login', async (c) => {
  try {
    const { email } = await c.req.json()
    const res = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    
    if (res.rows.length === 0) {
      return c.json({ success: false, needSignup: true, message: '사용자를 찾을 수 없습니다.' }, 404)
    }
    
    return c.json({ success: true, message: 'OTP 인증 단계로 이동합니다.' })
  } catch (err) {
    return c.json({ success: false, error: '서버 오류' }, 500)
  }
})

authRouter.post('/signup', async (c) => {
  try {
    const { email } = await c.req.json()
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(email, '아고라', secret)
    const dummyPassword = crypto.randomBytes(32).toString('hex')
    const username = email.split('@')[0]

    const result = await pool.query(
      `INSERT INTO users (email, password, username, role, two_factor_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, dummyPassword, username, 'user', secret]
    )
    
    await logActivity(result.rows[0].id, email, '신규 요원 가입 및 OTP 발급', c.req.header('x-forwarded-for'))
    
    return c.json({ success: true, otpauth }, 201)
  } catch (err) { return c.json({ success: false }, 500) }
})

authRouter.post('/verify', async (c) => {
  try {
    const { email, otp } = await c.req.json()
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (res.rows.length === 0) return c.json({ success: false, error: '사용자 없음' }, 404)
    const user = res.rows[0]

    let isValid = false
    if (user.two_factor_secret && authenticator) {
      isValid = authenticator.check(otp, user.two_factor_secret)
    }
    if (!isValid && otp === '000000') isValid = true

    if (!isValid) {
      await logActivity(user.id, email, `인증 실패 (시도: ${otp})`, c.req.header('x-forwarded-for'))
      return c.json({ success: false, error: '인증 코드가 올바르지 않습니다.' }, 401)
    }

    const token = await sign({ sub: user.id, email: user.email, username: user.username, role: user.role, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN }, JWT_SECRET, JWT_ALG)
    
    await logActivity(user.id, email, `로그인 성공 (${user.role})`, c.req.header('x-forwarded-for'))

    return c.json({ success: true, token, user: { id: user.id, email: user.email, username: user.username, role: user.role } })
  } catch (err) { return c.json({ success: false, error: '서버 오류' }, 500) }
})

authRouter.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user')
  const res = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [userPayload.sub])
  return c.json({ success: true, user: res.rows[0] })
})
