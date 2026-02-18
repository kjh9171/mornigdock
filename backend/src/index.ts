import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import axios from 'axios'
import * as cheerio from 'cheerio'
import cron from 'node-cron'

// otplib v13 API
const { TOTP, generateSecret, generateURI, verify } = require('otplib')

// 데이터 저장 경로
const DATA_DIR = join(process.cwd(), 'data');
const POSTS_FILE = join(DATA_DIR, 'posts.json');
const USERS_FILE = join(DATA_DIR, 'users.json');

// 데이터 디렉토리 생성
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Welcome to Agora Global Platform API' })
})

// === Mock Database ===
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
    secret?: string; 
}

// 데이터 로드 함수
function loadUsers(): User[] {
  try {
    if (existsSync(USERS_FILE)) {
      const data = readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Storage] Failed to load users:', error);
  }
  return [];
}

function loadPosts(): Post[] {
  try {
    if (existsSync(POSTS_FILE)) {
      const data = readFileSync(POSTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Storage] Failed to load posts:', error);
  }
  return [];
}

// 데이터 저장 함수
function saveUsers() {
  try {
    writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), 'utf-8');
    console.log('[Storage] Users saved successfully');
  } catch (error) {
    console.error('[Storage] Failed to save users:', error);
  }
}

function savePosts() {
  try {
    writeFileSync(POSTS_FILE, JSON.stringify(postsStore, null, 2), 'utf-8');
    console.log('[Storage] Posts saved successfully');
  } catch (error) {
    console.error('[Storage] Failed to save posts:', error);
  }
}

// 초기 데이터 로드
const usersStore: User[] = loadUsers();
const postsStore: Post[] = loadPosts();

console.log(`[Storage] Loaded ${usersStore.length} users and ${postsStore.length} posts`);

// Reset Posts/Media as well? User said "subscriber all initialization", implies Users. 
// But let's keep content for now so the app isn't empty, or maybe reset them too?
// "가입자 전부 초기해 시켜서 다시 시작하자" -> "Initialize all subscribers and restart".
// I will keep content mocks but reset users.

interface MediaItem {
  id: string;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  url: string; // YouTube ID or Audio URL
  description: string;
  author: string; // Added by
  timestamp: string;
}

const mediaStore: MediaItem[] = [
  {
    id: 'm1',
    type: 'youtube',
    title: 'Agora Concept Teaser',
    url: 'dQw4w9WgXcQ', // Mock ID
    description: 'The future of digital democracy.',
    author: 'admin@agora.com',
    timestamp: new Date().toISOString()
  },
  {
    id: 'm2',
    type: 'music',
    title: 'Focus Flow - LoFi',
    url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg', // Mock Audio
    description: 'Best music for deep work.',
    author: 'admin@agora.com',
    timestamp: new Date().toISOString()
  }
];

// === Auth Routes ===

app.post('/api/auth/signup', async (c) => {
    const { email } = await c.req.json<{ email: string }>();
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const existing = usersStore.find(u => u.email === email);
    if (existing) return c.json({ error: 'User already exists. Please login.' }, 409);

    const secret = generateSecret();
    const otpauth = generateURI({ secret, label: email, issuer: 'Agora', type: 'totp' });

    const newUser: User = { 
        email, 
        joinedAt: new Date().toISOString(), 
        // Auto-Admin Rule
        isAdmin: email === 'gimjonghwan319@gmail.com',
        secret 
    };
    usersStore.push(newUser);
    saveUsers(); // 새로운 사용자 저장

    return c.json({ success: true, secret, otpauth });
});

app.post('/api/auth/login', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  const user = usersStore.find(u => u.email === email);
  if (!user) {
      return c.json({ error: 'User not found', needSignup: true }, 404);
  }

  return c.json({ message: 'Enter Google OTP', success: true });
});

app.post('/api/auth/verify', async (c) => {
  const { email, otp } = await c.req.json<{ email: string; otp: string }>();
  if (!email || !otp) return c.json({ error: 'Email and OTP are required' }, 400);

  const user = usersStore.find(u => u.email === email);
  if (!user) return c.json({ error: 'User not found' }, 404);

  let isValid = false;

  // STRICT OTP Mode: No bypass.
  if (user.secret) {
      try {
        isValid = verify({ token: otp, secret: user.secret });
      } catch (err) {
        console.error('TOTP Check Error:', err);
      }
  }

  if (!isValid) return c.json({ error: 'Invalid OTP Code' }, 401);

  const hashedEmail = createHash('sha256').update(email).digest('hex');
  const token = `mock-token-${hashedEmail.substring(0, 10)}`;
  const isAdmin = user.isAdmin; 

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
  savePosts(); // 새로운 게시물 저장
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
  savePosts(); // 새로운 댓글 저장
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
        saveUsers(); // 사용자 삭제 후 저장
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
        savePosts(); // 게시물 삭제 후 저장
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
        savePosts(); // 게시물 업데이트 후 저장
        return c.json(post);
    }
    return c.json({ error: 'Post not found' }, 404);
});


// === Content Routes (Enhanced) ===

// 초기에는 빈 배열로 시작
const newsStore: any[] = [];

// 뉴스 스크랩 함수
async function scrapeAndStoreNews() {
  try {
    console.log('[Scraper] Starting news scrape...');
    const url = 'https://news.naver.com/main/list.naver?mode=LPOD&mid=sec&sid1=001&sid2=140&oid=001&isYeonhapFlash=Y';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const articles: any[] = [];

    // 네이버 뉴스 리스트 파싱
    $('.type06_headline li, .type06 li').each((index, element) => {
      if (articles.length >= 10) return false; // 최대 10개

      const $elem = $(element);
      const $link = $elem.find('dt:not(.photo) a, dd a').first();
      const title = $link.text().trim();
      const href = $link.attr('href');
      const summary = $elem.find('.lede').text().trim() || $elem.find('dd span.lede').text().trim() || '속보 내용';

      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : `https://news.naver.com${href}`;
        
        // 중복 체크 (URL 기준)
        const exists = newsStore.find(n => n.url === fullUrl);
        if (!exists) {
          articles.push({
            id: Date.now() + index,
            source: 'Naver',
            type: 'breaking',
            title: { ko: title, en: title },
            summary: { ko: summary, en: summary },
            content: { ko: `${summary}\n\n자세한 내용은 원문을 확인해주세요.`, en: `${summary}\n\nPlease check the original article for details.` },
            url: fullUrl,
            author: 'naver-scraper',
            scrapedAt: new Date().toISOString()
          });
        }
      }
    });

    // 새로운 기사만 추가
    if (articles.length > 0) {
      newsStore.unshift(...articles); // 최신 기사를 앞에 추가
      
      // 최대 50개까지만 유지
      if (newsStore.length > 50) {
        newsStore.splice(50);
      }
      
      console.log(`[Scraper] Added ${articles.length} new articles. Total: ${newsStore.length}`);
    } else {
      console.log('[Scraper] No new articles found.');
    }
  } catch (error) {
    console.error('[Scraper] Error:', error);
  }
}

// 서버 시작 시 즉시 한 번 실행
scrapeAndStoreNews();

// 매 시간마다 자동 스크랩 (0분에 실행)
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Hourly news scrape triggered');
  scrapeAndStoreNews();
});

// 매 10분마다 스크랩 (더 자주 업데이트하려면)
cron.schedule('*/10 * * * *', () => {
  console.log('[Cron] 10-minute news scrape triggered');
  scrapeAndStoreNews();
});

app.get('/api/news', (c) => {
  return c.json(newsStore);
});

app.patch('/api/news/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const { title, summary, content, url } = await c.req.json<{ 
    title?: { ko: string; en: string }; 
    summary?: { ko: string; en: string }; 
    content?: { ko: string; en: string };
    url?: string;
  }>();
  
  const news = newsStore.find(n => n.id === id);
  if (!news) return c.json({ error: 'News not found' }, 404);
  
  if (title) news.title = title;
  if (summary) news.summary = summary;
  if (content) news.content = content;
  if (url !== undefined) news.url = url;
  
  return c.json(news);
});

app.delete('/api/news/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const index = newsStore.findIndex(n => n.id === id);
  
  if (index === -1) return c.json({ error: 'News not found' }, 404);
  
  newsStore.splice(index, 1);
  return c.json({ success: true });
});

// === Naver News Scraper ===
app.get('/api/news/scrape', async (c) => {
  try {
    const url = 'https://news.naver.com/main/list.naver?mode=LPOD&mid=sec&sid1=001&sid2=140&oid=001&isYeonhapFlash=Y';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const articles: any[] = [];

    // 네이버 뉴스 리스트 파싱
    $('.type06_headline li, .type06 li').each((index, element) => {
      if (articles.length >= 10) return false; // 최대 10개

      const $elem = $(element);
      const $link = $elem.find('dt:not(.photo) a, dd a').first();
      const title = $link.text().trim();
      const href = $link.attr('href');
      const summary = $elem.find('.lede').text().trim() || $elem.find('dd span.lede').text().trim() || '속보 내용';

      if (title && href) {
        articles.push({
          id: Date.now() + index,
          source: 'Naver',
          type: 'breaking',
          title: { ko: title, en: title },
          summary: { ko: summary, en: summary },
          content: { ko: `${summary}\n\n자세한 내용은 원문을 확인해주세요.`, en: `${summary}\n\nPlease check the original article for details.` },
          url: href.startsWith('http') ? href : `https://news.naver.com${href}`,
          author: 'naver-scraper'
        });
      }
    });

    return c.json(articles);
  } catch (error) {
    console.error('Scraping error:', error);
    return c.json({ error: 'Failed to scrape news' }, 500);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 8787
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
