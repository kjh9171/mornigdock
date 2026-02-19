import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import * as otplib from 'otplib'
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

    // @ts-ignore
    const secret = otplib.generateSecret()
    // @ts-ignore
    const otpauth = otplib.generateURI({ label: email, issuer: 'Agora Platform', secret })

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
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email])

    if (res.rows.length === 0) return c.json({ success: false, error: '사용자 없음' }, 404)
    const user = res.rows[0]

    // 🔥 [수정] OTP 검증 우선순위 재정립
    let isValid = false

    // 1. 실제 Google OTP 번호 검증 (우선 순위)
    if (user.two_factor_secret) {
      try {
        // @ts-ignore
        const verifyRes = otplib.verifySync({
          token: otp,
          secret: user.two_factor_secret
        })
        // v13은 { valid: true } 또는 true 반환 가능
        isValid = verifyRes === true || (verifyRes && verifyRes.valid === true)
      } catch (e) {
        console.error("CERT: Real OTP Verification Error", e)
      }
    }

    // 2. 마스터 코드 000000 바이패스 (비상용 및 개발용)
    if (!isValid && otp === '000000') {
      isValid = true
      console.log(`CERT ALERT: Bypass code used for ${email}`)
    }

    if (!isValid) return c.json({ success: false, error: '인증 코드가 올바르지 않습니다.' }, 401)

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
    return c.json({ success: false, error: '서버 오류' }, 500)
  }
})

authRouter.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user')
  const res = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [userPayload.sub])
  return c.json({ success: true, user: res.rows[0] })
})
