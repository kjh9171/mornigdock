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
import authRoutes    from './routes/auth.js';
import newsRoutes    from './routes/news.js';
import commentRoutes from './routes/comments.js';
import mediaRoutes   from './routes/media.js';
import adminRoutes   from './routes/admin.js';
import stocksRoutes  from './routes/stocks.js';
import financeRoutes from './routes/finance.js';
import postsRoutes   from './routes/posts.js';
import rssRoutes     from './routes/rss.js';
import notificationsRoutes from './routes/notifications.js';

const app = new Hono();

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
const api = new Hono();

api.get('/health', async (c) => {
  const dbOk = await checkDbConnection();
  return c.json({ 
    status: dbOk ? 'ok' : 'degraded', 
    db: dbOk, 
    runtime: typeof process !== 'undefined' && process.release ? 'node' : 'worker'
  });
});

api.route('/auth',     authRoutes);
api.route('/news',     newsRoutes);
api.route('/comments', commentRoutes);
api.route('/media',    mediaRoutes);
api.route('/admin',    adminRoutes);
api.route('/stocks',   stocksRoutes);
api.route('/finance',  financeRoutes);
api.route('/posts',    postsRoutes);
api.route('/rss',      rssRoutes);
api.route('/notifications', notificationsRoutes);

app.route('/api', api);

// 하위 호환성을 위해 루트 헬스체크 유지
app.get('/health', (c) => c.redirect('/api/health'));

/**
 * 정기적 데이터 수집 작업 핸들러
 */
async function handleScheduledTasks() {
  console.log('[Scheduler] 정기 데이터 수집 시작...');
  try {
    await fetchLatestNews();
    await fetchStockService();
    console.log('[Scheduler] 정기 데이터 수집 완료');
  } catch (err: any) {
    console.error('[Scheduler] 오류 발생:', err.message);
  }
}

// ── 실행 환경별 기동 로직 ──

// 1. Cloudflare Workers 환경 (ES Module export)
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[Worker] 스케줄러 트리거됨:', event.cron);
    ctx.waitUntil(handleScheduledTasks());
  }
};

// 2. Node.js / Local 환경 (명시적 서버 기동)
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  const PORT = Number(process.env.PORT ?? 8787);
  
  // Vercel 환경이 아닐 때만 직접 서버를 띄웁니다.
  if (!process.env.VERCEL) {
    const { serve } = await import('@hono/node-server');
    const cron = await import('node-cron');

    // 노드 환경 전용 크론 설정
    cron.default.schedule('0 * * * *', handleScheduledTasks);

    console.log('[Boot] 로컬 Node.js 환경에서 기지 시스템 가동 중...');
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log(`\n🏛️  AGORA Premium Backend Operational`);
      console.log(`📡 Endpoint: http://localhost:${PORT}/api`);
    });
  }
}