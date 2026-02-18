import { Hono } from 'hono'
import { json } from 'hono/utils'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import { prisma } from '@/server/db'

// 환경변수
const JWT_SECRET = process.env.JWT_SECRET!
const JWT_ALG = 'HS256' // 여기에 알고리즘을 명시

const auth = new Hono()

// 사용자 등록
auth.post('/register', async (c) => {
  const body = await c.req.json()
  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }).safeParse(body)

  if (!parsed.success) {
    return json({ error: parsed.error.formErrors.join(',') }, 400)
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (exists) {
    return json({ error: 'User exists' }, 409)
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      password: parsed.data.password, // hashing 적용 필요
    },
  })

  return json({ id: user.id, email: user.email }, 201)
})

// 로그인
auth.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }).safeParse(body)

  if (!parsed.success) {
    return json({ error: parsed.error.formErrors.join(',') }, 400)
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user || user.password !== parsed.data.password) {
    return json({ error: 'Invalid credentials' }, 401)
  }

  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24시간
    },
    JWT_SECRET,
    JWT_ALG,
  )

  return json({ token })
})

// 현재 로그인된 사용자 정보
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return json({ error: 'Authorization missing' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verify(token, JWT_SECRET, JWT_ALG)

    // 정상 검증시 payload를 반환
    return json({ user: payload })
  } catch (err) {
    console.error('[토큰 검증 오류]', err)
    return json({ error: 'Unauthorized' }, 401)
  }
})

export default auth
