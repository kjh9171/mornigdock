import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { authenticator } from 'otplib'
import pool from '../db'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

export const authRouter = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_ALG = 'HS256'
const JWT_EXPIRES_IN = 60 * 60 * 24 // 24시간

/**
 * 회원가입 (TOTP 시크릿 생성)
 */
authRouter.post('/signup', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ success: false, error: '이메일이 필요합니다.' }, 400)

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) return c.json({ success: false, error: '이미 가입된 이메일입니다.' }, 409)

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(email, '아고라', secret)

    const dummyPassword = crypto.randomBytes(32).toString('hex')
    const username = email.split('@')[0]

    await pool.query(
      `INSERT INTO users (email, password, username, role, two_factor_secret) 
       VALUES ($1, $2, $3, $4, $5)`,
      [email, dummyPassword, username, 'user', secret]
    )

    return c.json({ success: true, otpauth }, 201)
  } catch (err) {
    console.error('Signup Error:', err)
    return c.json({ success: false, error: '서버 오류' }, 500)
  }
})

/**
 * 로그인 요청 (이메일 확인)
 */
authRouter.post('/login', async (c) => {
  try {
    const { email } = await c.req.json()
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email])

    if (res.rows.length === 0) {
      return c.json({ success: false, needSignup: true }, 404)
    }

    return c.json({ success: true, message: 'OTP 요청됨' })
  } catch (err) {
    return c.json({ success: false, error: '서버 오류' }, 500)
  }
})

/**
 * OTP 검증 (BYPASS 코드: 000000)
 */
authRouter.post('/verify', async (c) => {
  try {
    const { email, otp } = await c.req.json()
    console.log(`📡 CERT: Verification attempt for ${email} with OTP ${otp}`)
    
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email])

    if (res.rows.length === 0) return c.json({ success: false, error: '사용자 없음' }, 404)
    const user = res.rows[0]

    let isValid = false

    // 1. Google OTP 검증 (authenticator singleton 사용)
    if (user.two_factor_secret) {
      try {
        isValid = authenticator.verify({
          token: otp,
          secret: user.two_factor_secret
        })
        console.log(`📡 CERT: Google OTP Verification Result: ${isValid}`)
      } catch (e) {
        console.error("CERT: TOTP Internal Error", e)
      }
    }

    // 2. 마스터 코드 바이패스
    if (!isValid && otp === '000000') {
      isValid = true
      console.warn(`📡 CERT ALERT: Emergency Bypass used for ${email}`)
    }

    if (!isValid) {
      console.error(`📡 CERT: Authentication failed for ${email}`)
      return c.json({ success: false, error: '인증 코드가 올바르지 않습니다.' }, 401)
    }

    // 토큰 생성
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN
      },
      JWT_SECRET,
      JWT_ALG
    )

    console.log(`📡 CERT: Authentication success for ${email} (${user.role})`)

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    })
  } catch (err) {
    console.error('Verify Error:', err)
    return c.json({ success: false, error: '서버 오류' }, 500)
  }
})

authRouter.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user')
  const res = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [userPayload.sub])
  return c.json({ success: true, user: res.rows[0] })
})

