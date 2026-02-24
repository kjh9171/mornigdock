import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import cron from 'node-cron';
import { checkDbConnection } from './db/pool.js';
import { fetchLatestNews } from './services/newsService.js';
import { fetchStockService } from './stockService.js';
import authRoutes    from './routes/auth.js';
import newsRoutes    from './routes/news.js';
import commentRoutes from './routes/comments.js';
import mediaRoutes   from './routes/media.js';
import adminRoutes   from './routes/admin.js';
import stocksRoutes  from './routes/stocks.js';
import postsRoutes   from './routes/posts.js';
import rssRoutes     from './routes/rss.js';   // ✅ 추가

const app = new Hono();
const PORT = Number(process.env.PORT ?? 8787);

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
  return c.json({ status: dbOk ? 'ok' : 'degraded', db: dbOk, uptime: process.uptime() });
});

api.route('/auth',     authRoutes);
api.route('/news',     newsRoutes);
api.route('/comments', commentRoutes);
api.route('/media',    mediaRoutes);
api.route('/admin',    adminRoutes);
api.route('/stocks',   stocksRoutes);
api.route('/posts',    postsRoutes);
api.route('/rss',      rssRoutes);   // ✅ 추가

app.route('/api', api);

// 하위 호환성을 위해 루트 헬스체크 유지
app.get('/health', (c) => c.redirect('/api/health'));

// ── 데이터 자동 수집 스케줄러 ──
cron.schedule('0 * * * *', async () => {
  try {
    await fetchLatestNews();
    await fetchStockService();
  } catch (err: any) {
    console.error('[Scheduler] Error:', err.message);
  }
});

// ── 서버 기동 ──
async function bootstrap() {
  console.log('[Boot] 기지 시스템 최적화 중...');
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`\n🏛️  AGORA Premium Backend Operational`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/api`);
  });
}

bootstrap();