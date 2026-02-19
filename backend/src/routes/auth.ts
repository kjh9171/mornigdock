import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import * as otplib from 'otplib'
import pool from '../db'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

// ✅ [보안/호환성] otplib의 ESM/CJS 호환성 이슈를 해결하기 위한 정밀 추출 로직
// @ts-ignore
const authenticator = otplib.authenticator || (otplib.default && otplib.default.authenticator)

if (!authenticator) {
  console.error('CERT ERROR: otplib authenticator를 로드할 수 없습니다.')
}

export const authRouter = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_ALG = 'HS256'
const JWT_EXPIRES_IN = 60 * 60 * 24 // 24시간

/**
 * 회원가입 (TOTP 시크릿 생성)
 */
authRouter.post('/signup', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { success: false, message: '이메일 형식이 올바르지 않습니다.', errors: parsed.error.errors },
        400
      )
    }

    const { email } = parsed.data

    // 이메일 중복 체크
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])

    if (existingUser.rows.length > 0) {
      return c.json({ success: false, error: '이미 가입된 이메일입니다.' }, 409)
    }

    // TOTP 시크릿 생성
    const secret = authenticator.generateSecret()
    
    // OTPAuth URL 생성 (Google Authenticator 호환)
    const otpauth = authenticator.keyuri(email, 'Agora Platform', secret)

    // 임시 비밀번호 생성 (비밀번호 필드 제약조건 만족용)
    const dummyPassword = crypto.randomBytes(32).toString('hex')

    // 사용자 생성 (아직 검증되지 않음, 하지만 DB에는 저장)
    // 실제로는 'pending_users' 테이블을 쓰거나 is_verified 플래그를 써야 하지만,
    // 간단한 구현을 위해 바로 users에 넣되, 로그인은 verify를 통과해야만 가능
    const result = await pool.query(
      `INSERT INTO users (email, password, username, role, two_factor_secret) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, username, role`,
      [email, dummyPassword, email.split('@')[0], 'user', secret]
    )

    return c.json(
      {
        success: true,
        message: 'QR 코드를 스캔하여 등록을 완료하세요.',
        otpauth,
      },
      201
    )
  } catch (error) {
    console.error('[SIGNUP ERROR]', error)
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 로그인 요청 (사용자 존재 여부 확인)
 */
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json({ success: false, error: '이메일 형식이 올바르지 않습니다.' }, 400)
    }

    const { email } = parsed.data

    // 사용자 조회
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, needSignup: true }, 404) // Frontend expects 404 or specific flag? Frontend code: checks data.needSignup
    }

    return c.json({
      success: true,
      message: 'OTP 코드를 입력해주세요.',
    })
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return c.json({ success: false, error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * OTP 검증 및 토큰 발급
 */
authRouter.post('/verify', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json({ success: false, error: '이메일과 6자리 OTP를 입력해주세요.' }, 400)
    }

    const { email, otp } = parsed.data

    // 사용자 및 시크릿 조회
    const result = await pool.query(
      'SELECT id, email, username, role, two_factor_secret FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    const user = result.rows[0]

    // TOTP 검증
    // 개발 환경 편의를 위해 '000000' 입력 시 패스 (선택 사항, 보안상 제거 가능하지만 테스트용으로 유지)
    // const isValid = otp === '000000' || authenticator.check(otp, user.two_factor_secret)
    
    // 실제 검증
    let isValid = false
    try {
        isValid = authenticator.check(otp, user.two_factor_secret)
    } catch (e) {
        console.error("OTP Check Error:", e)
    }

    if (!isValid) {
      return c.json({ success: false, error: 'OTP 코드가 올바르지 않습니다.' }, 401)
    }

    // JWT 토큰 생성
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
      },
      JWT_SECRET,
      JWT_ALG
    )

    return c.json({
      success: true,
      message: '인증 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[VERIFY ERROR]', error)
    return c.json({ success: false, error: '인증 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 현재 로그인 사용자 조회
 */
authRouter.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user')

    if (!user) {
      return c.json({ success: false, message: '인증되지 않은 사용자입니다.' }, 401)
    }

    // 최신 사용자 정보 조회
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users WHERE id = $1',
      [user.sub]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({
      success: true,
      user: result.rows[0],
    })
  } catch (error) {
    console.error('[ME ERROR]', error)
    return c.json({ success: false, message: '사용자 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 로그아웃
 */
authRouter.post('/logout', (c) => {
  return c.json({
    success: true,
    message: '로그아웃되었습니다.',
  })
})
