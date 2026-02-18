import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const auth = new Hono()

// 환경변수
const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_ALG = 'HS256'
const JWT_EXPIRES_IN = 60 * 60 * 24 // 24시간

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

/**
 * 회원가입
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Invalid input' }, 400)
    }

    const { email, password } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    return c.json(
      {
        id: user.id,
        email: user.email,
      },
      201
    )
  } catch (error) {
    console.error('[REGISTER ERROR]', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

/**
 * 로그인
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Invalid input' }, 400)
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN,
      },
      JWT_SECRET,
      JWT_ALG
    )

    return c.json({ token })
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

/**
 * 현재 로그인 사용자 조회
 */
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.split(' ')[1]

    const payload = await verify(token, JWT_SECRET, JWT_ALG)

    return c.json({
      user: payload,
    })
  } catch (error) {
    console.error('[TOKEN VERIFY ERROR]', error)
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

export default auth
