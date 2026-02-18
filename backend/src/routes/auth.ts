import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import pool from '../db'
import { authMiddleware } from '../middleware/auth'

export const authRouter = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_ALG = 'HS256'
const JWT_EXPIRES_IN = 60 * 60 * 24 // 24시간

/**
 * 회원가입
 */
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      username: z.string().min(2),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { success: false, message: '입력값이 올바르지 않습니다.', errors: parsed.error.errors },
        400
      )
    }

    const { email, password, username } = parsed.data

    // 이메일 중복 체크
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])

    if (existingUser.rows.length > 0) {
      return c.json({ success: false, message: '이미 사용 중인 이메일입니다.' }, 409)
    }

    // 사용자명 중복 체크
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username])

    if (existingUsername.rows.length > 0) {
      return c.json({ success: false, message: '이미 사용 중인 사용자명입니다.' }, 409)
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10)

    // 사용자 생성
    const result = await pool.query(
      `INSERT INTO users (email, password, username, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, username, role, created_at`,
      [email, hashedPassword, username, 'user']
    )

    const user = result.rows[0]

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

    return c.json(
      {
        success: true,
        message: '회원가입이 완료되었습니다.',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
      201
    )
  } catch (error) {
    console.error('[REGISTER ERROR]', error)
    return c.json({ success: false, message: '회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 로그인
 */
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json({ success: false, message: '이메일과 비밀번호를 올바르게 입력해주세요.' }, 400)
    }

    const { email, password } = parsed.data

    // 사용자 조회
    const result = await pool.query(
      'SELECT id, email, password, username, role FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    const user = result.rows[0]

    // 비밀번호 확인
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return c.json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
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
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return c.json({ success: false, message: '로그인 중 오류가 발생했습니다.' }, 500)
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
 * 로그아웃 (클라이언트에서 토큰 삭제)
 */
authRouter.post('/logout', (c) => {
  return c.json({
    success: true,
    message: '로그아웃되었습니다. 클라이언트에서 토큰을 삭제해주세요.',
  })
})
