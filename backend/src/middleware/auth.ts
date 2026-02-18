import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'

// ✅ 인증 필수 미들웨어
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '로그인이 필요합니다.' }, 401)
  }
  try {
    const token = authHeader.substring(7)
    const payload = await verify(token, JWT_SECRET) as any
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ success: false, message: '유효하지 않은 토큰입니다.' }, 401)
  }
}

// ✅ 관리자 전용 미들웨어
export async function adminMiddleware(c: Context, next: Next) {
  await authMiddleware(c, async () => {})
  const user = c.get('user')
  if (!user) return c.json({ success: false, message: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') {
    return c.json({ success: false, message: '관리자 권한이 필요합니다.' }, 403)
  }
  await next()
}

// ✅ 선택적 인증 미들웨어 (비로그인도 통과, 로그인 시 user 세팅)
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verify(authHeader.substring(7), JWT_SECRET) as any
      c.set('user', payload)
    } catch {}
  }
  await next()
}