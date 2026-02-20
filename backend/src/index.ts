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
import authRoutes    from './routes/auth.js';
import newsRoutes    from './routes/news.js';
import commentRoutes from './routes/comments.js';
import mediaRoutes   from './routes/media.js';
import adminRoutes   from './routes/admin.js';

const app = new Hono();
const PORT = Number(process.env.PORT ?? 8787);

// ── 허용 Origins 파싱 ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ── 미들웨어 ─────────────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin;
    // localhost는 모든 포트 허용 (개발 및 로컬 환경 편의성)
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin;
    if (allowedOrigins.includes(origin)) return origin;
    if (process.env.NODE_ENV === 'development') return origin;
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Total-Count'],
  maxAge: 86400,
}));

// ── 헬스 체크 ────────────────────────────────────────────────────────────────
app.get('/health', async (c) => {
  const dbOk = await checkDbConnection();
  const status = dbOk ? 200 : 503;
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  }, status);
});

// ── 라우터 등록 ──────────────────────────────────────────────────────────────
app.route('/api/auth',     authRoutes);
app.route('/api/news',     newsRoutes);
app.route('/api/comments', commentRoutes);
app.route('/api/media',    mediaRoutes);
app.route('/api/admin',    adminRoutes);

// ── 404 핸들러 ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, message: `Route not found: ${c.req.path}` }, 404));

// ── 전역 에러 핸들러 ─────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json({ success: false, message: '서버 오류가 발생했습니다.' }, 500);
});

// ── 뉴스 자동 수집 스케줄러 ──────────────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
  console.log('[Scheduler] 뉴스 자동 수집 시작...');
  try {
    const count = await fetchLatestNews();
    console.log(`[Scheduler] 완료 - ${count}개 수집`);
  } catch (err: any) {
    console.error('[Scheduler] 수집 실패:', err.message);
  }
});

// ── 서버 시작 ────────────────────────────────────────────────────────────────
async function bootstrap() {
  // DB 연결 대기 (최대 30초)
  console.log('[Boot] DB 연결 확인 중...');
  for (let i = 0; i < 10; i++) {
    if (await checkDbConnection()) {
      console.log('[Boot] DB 연결 성공 ✓');
      break;
    }
    if (i === 9) {
      console.error('[Boot] DB 연결 실패 - 계속 진행합니다.');
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // 초기 뉴스 수집
  fetchLatestNews().catch(err => console.error('[Boot] 초기 뉴스 수집 실패:', err.message));

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`\n🏛️  Agora Backend v2.0`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`❤️  http://localhost:${PORT}/health\n`);
  });
}

bootstrap();
