import { Hono } from 'hono';

const rss = new Hono();

// ── RSS 피드 목록 ─────────────────────────────────────────
const RSS_FEEDS: Record<string, string> = {
  news:          'https://www.yna.co.kr/rss/news.xml',
  politics:      'https://www.yna.co.kr/rss/politics.xml',
  northkorea:    'https://www.yna.co.kr/rss/northkorea.xml',
  economy:       'https://www.yna.co.kr/rss/economy.xml',
  market:        'https://www.yna.co.kr/rss/market.xml',
  industry:      'https://www.yna.co.kr/rss/industry.xml',
  society:       'https://www.yna.co.kr/rss/society.xml',
  local:         'https://www.yna.co.kr/rss/local.xml',
  international: 'https://www.yna.co.kr/rss/international.xml',
  culture:       'https://www.yna.co.kr/rss/culture.xml',
  health:        'https://www.yna.co.kr/rss/health.xml',
  entertainment: 'https://www.yna.co.kr/rss/entertainment.xml',
  sports:        'https://www.yna.co.kr/rss/sports.xml',
  opinion:       'https://www.yna.co.kr/rss/opinion.xml',
  people:        'https://www.yna.co.kr/rss/people.xml',
};

const CATEGORIES = [
  { key: 'news',          label: '최신기사' },
  { key: 'politics',      label: '정치' },
  { key: 'northkorea',    label: '북한' },
  { key: 'economy',       label: '경제' },
  { key: 'market',        label: '마켓+' },
  { key: 'industry',      label: '산업' },
  { key: 'society',       label: '사회' },
  { key: 'local',         label: '전국' },
  { key: 'international', label: '세계' },
  { key: 'culture',       label: '문화' },
  { key: 'health',        label: '건강' },
  { key: 'entertainment', label: '연예' },
  { key: 'sports',        label: '스포츠' },
  { key: 'opinion',       label: '오피니언' },
  { key: 'people',        label: '사람들' },
];

// ── 메모리 캐시 (5분) ─────────────────────────────────────
interface CacheEntry {
  data: NewsItem[];
  time: number;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000;

// ── 타입 정의 ─────────────────────────────────────────────
interface NewsItem {
  title:       string;
  link:        string;
  description: string;
  pubDate:     string;
  category:    string;
  thumbnail:   string;
}

// ── XML 태그 값 추출 헬퍼 ─────────────────────────────────
function getTag(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
  );
  return m ? m[1].trim() : '';
}

function getAttr(block: string, tag: string, attr: string): string {
  const m = block.match(
    new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  );
  return m ? m[1] : '';
}

// ── RSS XML 파싱 ──────────────────────────────────────────
function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    // 썸네일: media:content → media:thumbnail → enclosure 순으로 시도
    const thumbnail =
      getAttr(block, 'media:content', 'url') ||
      getAttr(block, 'media:thumbnail', 'url') ||
      getAttr(block, 'enclosure', 'url') ||
      '';

    items.push({
      title:       getTag(block, 'title'),
      link:        getTag(block, 'link'),
      description: getTag(block, 'description'),
      pubDate:     getTag(block, 'pubDate'),
      category:    getTag(block, 'category'),
      thumbnail,
    });
  }

  return items;
}

// ── GET /api/rss/categories ───────────────────────────────
rss.get('/categories', (c) => {
  return c.json({ success: true, data: CATEGORIES });
});

// ── GET /api/rss?category=news&limit=20 ──────────────────
rss.get('/', async (c) => {
  const category = (c.req.query('category') ?? 'news') as string;
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '20'), 50);

  const feedUrl = RSS_FEEDS[category];
  if (!feedUrl) {
    return c.json({ success: false, message: '유효하지 않은 카테고리입니다.' }, 400);
  }

  // 캐시 확인
  const cached = cache[category];
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return c.json({
      success: true,
      cached:  true,
      data:    cached.data.slice(0, limit),
    });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 MorningDock/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml   = await response.text();
    const items = parseRSS(xml);

    cache[category] = { data: items, time: Date.now() };

    return c.json({
      success: true,
      cached:  false,
      data:    items.slice(0, limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[RSS] fetch 실패 (${category}):`, message);
    return c.json({ success: false, message: 'RSS 불러오기 실패', error: message }, 500);
  }
});

export default rss;