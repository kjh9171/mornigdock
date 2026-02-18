import { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'
import pool from '../db'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const JWT_ALG = 'HS256'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

export interface User {
  sub: number
  email: string
  username: string
  role: string
}

/**
 * 인증 미들웨어 (필수)
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: '인증 토큰이 필요합니다.' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = await verify(token, JWT_SECRET, JWT_ALG)

    // DB에서 사용자 정보 확인
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [payload.sub]
    )

    if (result.rows.length === 0) {
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 404)
    }

    const user = result.rows[0]
    c.set('user', {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    await next()
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]', error)
    return c.json({ success: false, message: '유효하지 않은 토큰입니다.' }, 401)
  }
}

/**
 * 선택적 인증 미들웨어 (비로그인도 허용)
 */
export const optionalAuth = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const payload = await verify(token, JWT_SECRET, JWT_ALG)

      const result = await pool.query(
        'SELECT id, email, username, role FROM users WHERE id = $1',
        [payload.sub]
      )

      if (result.rows.length > 0) {
        const user = result.rows[0]
        c.set('user', {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        })
      }
    }
  } catch (error) {
    console.log('[OPTIONAL AUTH] 토큰 검증 실패, 비로그인 상태로 진행')
  }

  await next()
}

/**
 * 관리자 권한 체크 미들웨어
 */
export const adminMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user') as User | undefined

  if (!user || user.role !== 'admin') {
    return c.json({ success: false, message: '관리자 권한이 필요합니다.' }, 403)
  }

  await next()
}
