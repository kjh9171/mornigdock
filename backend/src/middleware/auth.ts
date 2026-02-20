import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret';

export function requireAuth(roles?: string[]) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, message: '인증 토큰이 필요합니다.' }, 401);
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // 사용자 차단 여부 실시간 확인
      const result = await query(
        'SELECT id, role, is_blocked FROM users WHERE id = $1',
        [payload.userId]
      );
      if (result.rowCount === 0) {
        return c.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, 401);
      }
      const user = result.rows[0];
      if (user.is_blocked) {
        return c.json({ success: false, message: '차단된 계정입니다.' }, 403);
      }

      // 역할 권한 확인
      if (roles && roles.length > 0 && !roles.includes(user.role)) {
        return c.json({ success: false, message: '접근 권한이 없습니다.' }, 403);
      }

      c.set('user', { ...payload, role: user.role });
      await next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return c.json({ success: false, message: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' }, 401);
      }
      return c.json({ success: false, message: '유효하지 않은 토큰입니다.' }, 401);
    }
  };
}

export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        c.set('user', payload);
      } catch {
        // 토큰 오류 시 그냥 통과
      }
    }
    await next();
  };
}
