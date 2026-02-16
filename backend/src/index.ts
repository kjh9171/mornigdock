import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash } from 'node:crypto'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Welcome to Agora Global Platform API' })
})

// === Mock Database ===
const otpStore: Record<string, string> = {};
const logsStore: Array<{ id: string; email: string; activity: string; timestamp: string }> = [];

// === Auth Routes ===

app.post('/api/auth/login', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  const otp = '123456'; 
  otpStore[email] = otp;
  console.log(`[AUTH] OTP for ${email}: ${otp}`);

  return c.json({ message: 'OTP sent', success: true });
});

app.post('/api/auth/verify', async (c) => {
  const { email, otp } = await c.req.json<{ email: string; otp: string }>();
  if (!email || !otp) return c.json({ error: 'Email and OTP are required' }, 400);

  if (otpStore[email] !== otp) return c.json({ error: 'Invalid OTP' }, 401);
  delete otpStore[email];

  const hashedEmail = createHash('sha256').update(email).digest('hex');
  const token = `mock-token-${hashedEmail.substring(0, 10)}`;
  const isAdmin = email.includes('admin'); // Simple Admin Check

  return c.json({ 
    success: true,
    token,
    user: { email, hashedEmail, isAdmin }
  });
});

// === Activity Tracking Routes ===

app.post('/api/log', async (c) => {
  const { email, activity } = await c.req.json<{ email: string; activity: string }>();
  
  const log = {
    id: Math.random().toString(36).substring(7),
    email, // In real app, store hash or encrypted
    activity,
    timestamp: new Date().toISOString()
  };
  
  logsStore.unshift(log); // Add to beginning
  console.log(`[LOG] ${email}: ${activity}`);
  
  return c.json({ success: true });
});

app.get('/api/admin/logs', (c) => {
  // In real app, check admin token
  return c.json(logsStore);
});

// === Content Routes ===

app.get('/api/news', (c) => {
  return c.json([
    { id: 1, title: { ko: '아고라 프로젝트 시작', en: 'Agora Project Started' }, summary: { ko: '글로벌 플랫폼 구축을 위한 첫 걸음', en: 'First step for Global Platform' }, content: { ko: '상세 내용입니다...', en: 'Detail content...' } },
    { id: 2, title: { ko: '차세대 보안 시스템', en: 'Next-Gen Security System' }, summary: { ko: '이메일 해시 추적 기술 도입', en: 'Email Hash Tracking Tech Introduced' }, content: { ko: '보안 상세...', en: 'Security details...' } },
    { id: 3, title: { ko: '디자인 혁신', en: 'Design Innovation' }, summary: { ko: '미니멀리즘과 정보 밀도의 조화', en: 'Harmony of Minimalism and Info Density' }, content: { ko: '디자인 상세...', en: 'Design details...' } },
    { id: 4, title: { ko: '글로벌 대응 완료', en: 'Global Support Ready' }, summary: { ko: 'i18next 기반 다국어 지원', en: 'i18next based Multilingual Support' }, content: { ko: '글로벌 상세...', en: 'Global details...' } },
    { id: 5, title: { ko: '관리자 기능 강화', en: 'Admin Feature Enhanced' }, summary: { ko: '실시간 로그 추적 및 통제권', en: 'Real-time Log Tracking & Control' }, content: { ko: '관리자 상세...', en: 'Admin details...' } }
  ])
})

const port = 8787
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
