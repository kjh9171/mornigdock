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

// ── Env 타입 정의 (wrangler.toml [assets] binding) ──
type Env = {
  ASSETS: Fetcher;
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
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    runtime: typeof process !== 'undefined' && process.release ? 'node' : 'worker',
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
// SPA 라우팅을 위해 정적 파일이 없으면 index.html 반환
app.get('*', async (c) => {
  const env = c.env as Env;

  // ASSETS 바인딩이 없는 경우 (로컬 Node.js 환경)
  if (!env?.ASSETS) {
    return c.text('Frontend assets not available in local mode', 404);
  }

  try {
    // 요청한 정적 파일 시도
    const response = await env.ASSETS.fetch(c.req.raw);

    // 정적 파일이 없으면 (404) SPA용 index.html 반환
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
async function handleScheduledTasks(): Promise<void> {
  console.log('[Scheduler] 정기 데이터 수집 시작...');
  try {
    await fetchLatestNews();
    await fetchStockService();
    console.log('[Scheduler] 정기 데이터 수집 완료');
  } catch (err: any) {
    console.error('[Scheduler] 오류 발생:', err.message);
  }
}

// ── 1. Cloudflare Workers 환경 (기본 export) ──
export default {
  fetch: app.fetch,

  async scheduled(event: any, env: any, ctx: any) {
    console.log('[Worker] 스케줄러 트리거됨:', event.cron);
    ctx.waitUntil(handleScheduledTasks());
  },
};

// ── 2. Node.js 로컬 환경 (개발 서버 기동) ──
// wrangler.toml [define] "process.env.WORKER" = '"true"' 로 인해
// Workers 빌드 시 esbuild가 이 블록 전체를 dead code로 제거합니다.
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  const PORT = Number(process.env.PORT ?? 8787);

  if (!process.env.VERCEL) {
    const { serve } = await import('@hono/node-server');
    const cron      = await import('node-cron');

    cron.default.schedule('0 * * * *', handleScheduledTasks);

    console.log('[Boot] 로컬 Node.js 환경에서 서버 가동 중...');
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log('[Boot] AGORA Backend Operational');
      console.log('[Boot] Endpoint: http://localhost:' + PORT + '/api');
      console.log('[Boot] Cron: 매 시간 정각 자동 실행');
    });
  }
}
