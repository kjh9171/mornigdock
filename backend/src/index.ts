// ── 환경 변수 설정 (Node.js 환경 전용) ──
// wrangler.toml의 [define] 설정으로 빌드 시 process.env.WORKER = "true" 가 주입되어
// 아래 블록은 Workers 번들에서 dead code로 완전 제거됩니다.
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
// wrangler.toml [define]으로 인해 Workers 빌드에는 이 블록만 남습니다.
export default {
  fetch: app.fetch,

  // wrangler.toml의 [triggers] crons 설정과 연동
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[Worker] 스케줄러 트리거됨:', event.cron);
    ctx.waitUntil(handleScheduledTasks());
  },
};

// ── 2. Node.js 로컬 환경 (개발 서버 기동) ──
// [define] "process.env.WORKER" = '"true"' 주입으로 인해
// Workers 빌드 시 esbuild가 이 블록 전체를 dead code로 제거합니다.
// → node-cron이 번들에 포함되지 않아 __dirname 에러가 사라집니다.
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  const PORT = Number(process.env.PORT ?? 8787);

  if (!process.env.VERCEL) {
    const { serve } = await import('@hono/node-server');
    const cron      = await import('node-cron');

    // 매 시간 정각 실행 (로컬 개발 환경 전용)
    cron.default.schedule('0 * * * *', handleScheduledTasks);

    console.log('[Boot] 로컬 Node.js 환경에서 서버 가동 중...');
    serve({ fetch: app.fetch, port: PORT }, () => {
      console.log(`\n🏛️  AGORA Premium Backend Operational`);
      console.log(`📡 Endpoint: http://localhost:${PORT}/api`);
      console.log(`⏰ Cron: 매 시간 정각 자동 실행`);
    });
  }
}
```

---

## 🧠 동작 원리
```
[define] "process.env.WORKER" = '"true"' 주입
            ↓
esbuild 번들링 시:
  if (!process.env.WORKER)  →  if (!"true")  →  if (false)
            ↓
dead code elimination → node-cron 블록 번들에서 완전 제거
            ↓
✅ __dirname 에러 없음