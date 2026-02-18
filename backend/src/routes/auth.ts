import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import pool from '../db'

export const authRouter = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = 60 * 60 * 24 * 7 // 7일 (초 단위)

// ✅ 입력값 유효성 검사 헬퍼
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 6
}

// ─────────────────────────────────────────────
// POST /api/auth/register  →  회원가입
// ─────────────────────────────────────────────
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, username } = body

    // ✅ 입력값 검증
    if (!email || !password || !username) {
      return c.json(
        { success: false, message: '이메일, 비밀번호, 사용자명은 필수입니다.' },
        400
      )
    }

    if (!validateEmail(email)) {
      return c.json({ success: false, message: '올바른 이메일 형식이 아닙니다.' }, 400)
    }

    if (!validatePassword(password)) {
      return c.json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' }, 400)
    }

    // ✅ 이메일 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (existingUser.rows.length > 0) {
      return c.json({ success: false, message: '이미 사용 중인 이메일입니다.' }, 409)
    }

    // ✅ 비밀번호 해시화 (bcrypt salt rounds: 12)
    const hashedPassword = await bcrypt.hash(password, 12)

    // ✅ 사용자 생성
    const newUser = await pool.query(
      `INSERT INTO users (email, password, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, role, created_at`,
      [email.toLowerCase().trim(), hashedPassword, username.trim()]
    )

    const user = newUser.rows[0]

    // ✅ JWT 토큰 발급
    const token = await sign(
      {
        sub: String(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
      },
      JWT_SECRET
    )

    return c.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    }, 201)
  } catch (err) {
    console.error('[회원가입 오류]', err)
    return c.json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/login  →  로그인
// ─────────────────────────────────────────────
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    // ✅ 입력값 검증
    if (!email || !password) {
      return c.json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    // ✅ 사용자 조회 (email은 소문자로 저장)
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) {
      // 보안상 "이메일 또는 비밀번호"로 통일 (사용자 열거 공격 방지)
      return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    const user = result.rows[0]

    // ✅ 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // ✅ JWT 토큰 발급
    const token = await sign(
      {
        sub: String(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
      },
      JWT_SECRET
    )

    return c.json({
      success: true,
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('[로그인 오류]', err)
    return c.json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// ─────────────────────────────────────────────
// GET /api/auth/me  →  현재 사용자 정보 조회
// ─────────────────────────────────────────────
authRouter.get('/me', async (c) => {
  try {
    // ✅ Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: '인증 토큰이 없습니다.' }, 401)
    }

    const token = authHeader.substring(7) // "Bearer " 제거

    // ✅ 토큰 검증
    const payload = await verify(token, JWT_SECRET) as any

    // ✅ DB에서 최신 사용자 정보 조회
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users WHERE id = $1 AND is_active = true',
      [payload.sub]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('[토큰 검증 오류]', err)
    return c.json({ success: false, message: '유효하지 않은 토큰입니다.' }, 401)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/logout  →  로그아웃
// ─────────────────────────────────────────────
authRouter.post('/logout', (c) => {
  // ✅ 클라이언트 측에서 토큰 삭제 안내 (JWT는 서버에서 무효화 불가)
  return c.json({ success: true, message: '로그아웃 되었습니다. 클라이언트 토큰을 삭제하세요.' })
})