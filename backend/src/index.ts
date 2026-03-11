// ── 환경 변수 설정 (Node.js 환경 전용) ──
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  try {
    await import('dotenv/config');
  } catch (e) {
    // 워커 환경에서는 무시합니다.
  }
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import { checkDbConnection } from './db/pool.js';
import { fetchLatestNews } from './services/newsService.js';
import { fetchStockService } from './stockService.js';
import authRoutes          from './routes/auth.js';
import newsRoutes          from './routes/news.js';
import commentRoutes       from './routes/comments.js';
import mediaRoutes         from './routes/media.js';
import adminRoutes         from './routes/admin.js';
import stocksRoutes        from './routes/stocks.js';
import financeRoutes       from './routes/finance.js';
import postsRoutes         from './routes/posts.js';
import rssRoutes           from './routes/rss.js';
import notificationsRoutes from './routes/notifications.js';

// ── Env 타입 정의 ──
type Env = {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  WORKER: string;
};

const app = new Hono<{ Bindings: Env }>();

// ── 미들웨어 설정 ──
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── API 라우트 등록 ──
const api = new Hono<{ Bindings: Env }>();

api.get('/health', async (c) => {
  const dbOk = await checkDbConnection();
  const runtime = process.env.WORKER === 'true' ? 'worker' : 'node';
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    runtime,
  });
});

api.route('/auth',          authRoutes);
api.route('/news',          newsRoutes);
api.route('/comments',      commentRoutes);
api.route('/media',         mediaRoutes);
api.route('/admin',         adminRoutes);
api.route('/stocks',        stocksRoutes);
api.route('/finance',       financeRoutes);
api.route('/posts',         postsRoutes);
api.route('/rss',           rssRoutes);
api.route('/notifications', notificationsRoutes);

app.route('/api', api);

// 하위 호환성을 위한 루트 헬스체크 리다이렉트
app.get('/health', (c) => c.redirect('/api/health'));

// ✅ /api/* 외 모든 요청 → 정적 파일(프론트엔드) 서빙
app.get('*', async (c) => {
  const env = c.env as Env;

  if (!env?.ASSETS) {
    return c.text('Frontend assets not available in local mode', 404);
  }

  try {
    const response = await env.ASSETS.fetch(c.req.raw);

    if (response.status === 404) {
      const indexRequest = new Request(
        new URL('/index.html', c.req.url).toString(),
        c.req.raw
      );
      return env.ASSETS.fetch(indexRequest);
    }

    return response;
  } catch {
    return c.text('Not Found', 404);
  }
});

// ── 정기 데이터 수집 작업 ──
async function handleScheduledTasks(env?: Env): Promise<void> {
  console.log('[Scheduler] 정기 데이터 수집 시작...');
  try {
    await fetchLatestNews();
    await fetchStockService();
    console.log('[Scheduler] 정기 데이터 수집 완료');
  } catch (err: any) {
    console.error('[Scheduler] 오류 발생:', err.message);
  }
}

// ✅ Cloudflare env 바인딩을 process.env에 주입하는 헬퍼
function injectEnv(env: Env) {
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.JWT_SECRET)   process.env.JWT_SECRET   = env.JWT_SECRET;
  if (env.NODE_ENV)     process.env.NODE_ENV     = env.NODE_ENV;
  if (env.WORKER)       process.env.WORKER       = env.WORKER;
}

// ── 1. Cloudflare Workers 환경 (기본 export) ──
export default {
  // ✅ fetch 핸들러에서 env 바인딩 → process.env 동기화
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    injectEnv(env);
    return app.fetch(request, env, ctx);
  },

  // ✅ 스케줄러에서도 env 동기화
  async scheduled(event: any, env: Env, ctx: ExecutionContext) {
    injectEnv(env);
    console.log('[Worker] 스케줄러 트리거됨:', event.cron);
    ctx.waitUntil(handleScheduledTasks(env));
  },
};

// ── 2. Node.js 로컬 환경 (개발 서버 기동) ──
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  const PORT = Number(process.env.PORT ?? 8787);

  if (!process.env.VERCEL) {
    const { serve } = await import('@hono/node-server');
    const cron      = await import('node-cron');

    cron.default.schedule('0 * * * *', () => handleScheduledTasks());

    console.log('[Boot] 로컬 Node.js 환경에서 서버 가동 중...');
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log('[Boot] AGORA Backend Operational');
      console.log('[Boot] Endpoint: http://localhost:' + PORT + '/api');
      console.log('[Boot] Cron: 매 시간 정각 자동 실행');
    });
  }
}