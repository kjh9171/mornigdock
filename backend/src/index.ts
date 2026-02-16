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

// Agora Discussion DB
interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface Post {
  id: string;
  title: string; 
  content: string;
  author: string;
  timestamp: string;
  views: number;
  comments: Comment[];
  isNotice?: boolean; // Added for Admin
}

interface User {
    email: string;
    joinedAt: string;
    isAdmin: boolean;
}

const usersStore: User[] = [
    { email: 'admin@agora.com', joinedAt: new Date().toISOString(), isAdmin: true },
    { email: 'user@test.com', joinedAt: new Date().toISOString(), isAdmin: false }
];

const postsStore: Post[] = [
  {
    id: '1',
    title: '보안 시스템 관련 건의합니다.',
    content: '이메일 인증 방식이 매우 편리하네요. 다만 세션 유지 시간을 좀 늘려주실 수 있나요?',
    author: 'user@test.com',
    timestamp: new Date(Date.now() - 10000000).toISOString(),
    views: 120,
    comments: [
      { id: 'c1', author: 'admin@agora.com', content: '반영하여 검토하겠습니다.', timestamp: new Date(Date.now() - 8000000).toISOString() }
    ],
    isNotice: false
  },
  {
    id: '2',
    title: 'Suggestion for UI improvement',
    content: 'The dark mode contrast could be a bit better on the cards.',
    author: 'global@user.com',
    timestamp: new Date(Date.now() - 5000000).toISOString(),
    views: 45,
    comments: [],
    isNotice: false
  }
];

// ... MediaStore ...

// === Auth Routes ===

app.post('/api/auth/login', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  // Auto-register user if new
  if (!usersStore.find(u => u.email === email)) {
      usersStore.push({ email, joinedAt: new Date().toISOString(), isAdmin: email.includes('admin') });
  }

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
  const isAdmin = email.includes('admin'); 

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
    email,
    activity,
    timestamp: new Date().toISOString()
  };
  
  logsStore.unshift(log); 
  console.log(`[LOG] ${email}: ${activity}`);
  
  return c.json({ success: true });
});

app.get('/api/admin/logs', (c) => {
  return c.json(logsStore);
});

// === Discussion Board Routes ===

app.get('/api/posts', (c) => {
  return c.json(postsStore);
});

app.post('/api/posts', async (c) => {
  const { title, content, author } = await c.req.json<{ title: string; content: string; author: string }>();
  
  const newPost: Post = {
    id: Math.random().toString(36).substring(7),
    title,
    content,
    author,
    timestamp: new Date().toISOString(),
    views: 0,
    comments: []
  };
  
  postsStore.unshift(newPost);
  return c.json(newPost);
});

app.get('/api/posts/:id', (c) => {
  const id = c.req.param('id');
  const post = postsStore.find(p => p.id === id);
  
  if (!post) return c.json({ error: 'Post not found' }, 404);
  
  return c.json(post);
});

app.post('/api/posts/:id/comments', async (c) => {
  const id = c.req.param('id');
  const { author, content } = await c.req.json<{ author: string; content: string }>();
  
  const post = postsStore.find(p => p.id === id);
  if (!post) return c.json({ error: 'Post not found' }, 404);

  const newComment: Comment = {
    id: Math.random().toString(36).substring(7),
    author,
    content,
    timestamp: new Date().toISOString()
  };

  post.comments.push(newComment);
  return c.json(newComment);
});

// === Media Routes ===

app.get('/api/media', (c) => {
  return c.json(mediaStore);
});

app.post('/api/media', async (c) => {
  const { type, title, url, description, author } = await c.req.json<Omit<MediaItem, 'id' | 'timestamp'>>();
  
  const newItem: MediaItem = {
    id: Math.random().toString(36).substring(7),
    type,
    title,
    url,
    description,
    author,
    timestamp: new Date().toISOString()
  };
  
  mediaStore.unshift(newItem);
  return c.json(newItem);
});

app.delete('/api/media/:id', (c) => {
  const id = c.req.param('id');
  const index = mediaStore.findIndex(m => m.id === id);
  if (index === -1) return c.json({ error: 'Media not found' }, 404);
  
  mediaStore.splice(index, 1);
  return c.json({ success: true });
});

// === Admin Routes ===

app.get('/api/admin/users', (c) => {
    return c.json(usersStore);
});

app.delete('/api/admin/users', async (c) => {
    const { email } = await c.req.json<{ email: string }>();
    const index = usersStore.findIndex(u => u.email === email);
    if (index !== -1) {
        usersStore.splice(index, 1);
        // Also remove logs? Nah, keep logs for audit.
        return c.json({ success: true });
    }
    return c.json({ error: 'User not found' }, 404);
});

// Post Management
app.delete('/api/posts/:id', (c) => {
    const id = c.req.param('id');
    const index = postsStore.findIndex(p => p.id === id);
    if (index !== -1) {
        postsStore.splice(index, 1);
        return c.json({ success: true });
    }
    return c.json({ error: 'Post not found' }, 404);
});

app.patch('/api/posts/:id', async (c) => {
    const id = c.req.param('id');
    const { isNotice } = await c.req.json<{ isNotice: boolean }>();
    const post = postsStore.find(p => p.id === id);
    if (post) {
        post.isNotice = isNotice;
        return c.json(post);
    }
    return c.json({ error: 'Post not found' }, 404);
});


// === Content Routes (Enhanced) ===

app.get('/api/news', (c) => {
  // Enhanced Mock Data with Source and Type
  return c.json([
    { 
      id: 1, 
      source: 'Yonhap', // 연합뉴스
      type: 'breaking', 
      title: { ko: '[속보] 아고라 프로젝트, 글로벌 런칭 임박', en: '[Breaking] Agora Project Global Launch Imminent' }, 
      summary: { ko: '전 세계 보안 전문가들이 주목하는 차세대 플랫폼', en: 'Next-gen platform watched by security experts worldwide' }, 
      content: { ko: '(서울=연합뉴스) 아고라 팀은 오늘...', en: '(Seoul=Yonhap) The Agora team today...' } 
    },
    { 
      id: 2, 
      source: 'Naver', // 네이버뉴스
      type: 'breaking',
      title: { ko: 'IT 업계, "이메일 해시 추적" 기술 표준 되나', en: 'IT Industry: "Email Hash Tracking" becoming standard?' }, 
      summary: { ko: '개인정보 보호와 보안 두 마리 토끼 잡았다', en: 'Caught both privacy and security' }, 
      content: { ko: '네이버 뉴스 IT 섹션 주요 기사...', en: 'Naver News IT Section highlight...' } 
    },
    { 
      id: 3, 
      source: 'Agora', // 자체 분석
      type: 'analysis',
      title: { ko: '아고라 심층 리포트: 미니멀리즘 디자인의 미래', en: 'Agora Deep Dive: Future of Minimalist Design' }, 
      summary: { ko: '정보의 홍수 속에서 침묵(White Space)이 갖는 힘', en: 'The power of silence (White Space) in information flood' }, 
      content: { ko: '아고라 리서치 센터 분석 결과...', en: 'Agora Research Center analysis...' } 
    },
    { 
      id: 4, 
      source: 'Yonhap',
      type: 'breaking',
      title: { ko: '[1보] i18next 도입으로 언어 장벽 무너져', en: '[Flash] Language barrier crumbling with i18next' }, 
      summary: { ko: '실시간 언어 전환 기술 시연 성공', en: 'Successful demo of real-time language switch' }, 
      content: { ko: '기자회견장에서...', en: 'At the press conference...' } 
    },
    { 
      id: 5, 
      source: 'Agora',
      type: 'analysis',
      title: { ko: '관리자 통제권과 투명성의 균형', en: 'Balance between Admin Control and Transparency' }, 
      summary: { ko: '실시간 로그 추적 시스템의 윤리적 고찰', en: 'Ethical considerations of real-time log tracking' }, 
      content: { ko: '시스템 관리자의 권한은 어디까지인가...', en: 'How far should admin privileges go...' } 
    }
  ])
})

const port = 8787
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
