import { Hono } from 'hono';

const finance = new Hono();

// ── 타입 정의 ─────────────────────────────────────────────
interface FinanceNewsItem {
  title:       string;
  link:        string;
  description: string;
  pubDate:     string;
  category:    string;
  thumbnail:   string;
}

interface CacheEntry {
  data: FinanceNewsItem[];
  time: number;
}

// ── 연합인포맥스 RSS 피드 목록 ────────────────────────────
const RSS_FEEDS: Record<string, string> = {
  all:        'https://news.einfomax.co.kr/rss/allArticle.xml',
  popular:    'https://news.einfomax.co.kr/rss/clickTop.xml',
  stocks:     'https://news.einfomax.co.kr/rss/S1N2.xml',
  ib:         'https://news.einfomax.co.kr/rss/S1N7.xml',
  column:     'https://news.einfomax.co.kr/rss/S1N9.xml',
  terms:      'https://news.einfomax.co.kr/rss/S1N10.xml',
  people:     'https://news.einfomax.co.kr/rss/S1N11.xml',
  contrib:    'https://news.einfomax.co.kr/rss/S1N12.xml',
  feature:    'https://news.einfomax.co.kr/rss/S1N13.xml',
  policy:     'https://news.einfomax.co.kr/rss/S1N15.xml',
  bond:       'https://news.einfomax.co.kr/rss/S1N16.xml',
  realestate: 'https://news.einfomax.co.kr/rss/S1N17.xml',
  global:     'https://news.einfomax.co.kr/rss/S1N21.xml',
  intl:       'https://news.einfomax.co.kr/rss/S1N23.xml',
  press:      'https://news.einfomax.co.kr/rss/S1N25.xml',
};

const CATEGORIES = [
  { key: 'all',        label: '전체기사',      group: 'main' },
  { key: 'popular',    label: '인기기사',      group: 'main' },
  { key: 'stocks',     label: '증권',          group: 'market' },
  { key: 'bond',       label: '채권/외환',     group: 'market' },
  { key: 'global',     label: '해외주식',      group: 'market' },
  { key: 'policy',     label: '정책/금융',     group: 'economy' },
  { key: 'realestate', label: '부동산',        group: 'economy' },
  { key: 'ib',         label: 'IB/기업',       group: 'economy' },
  { key: 'intl',       label: '국제뉴스',      group: 'global' },
  { key: 'column',     label: '칼럼/이슈',     group: 'opinion' },
  { key: 'feature',    label: '기획기사',      group: 'opinion' },
  { key: 'contrib',    label: '외부기고',      group: 'opinion' },
  { key: 'people',     label: '인물/동정',     group: 'etc' },
  { key: 'terms',      label: '시사용어',      group: 'etc' },
  { key: 'press',      label: '보도자료',      group: 'etc' },
];

// ── 메모리 캐시 (5분) ─────────────────────────────────────
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000;

// ── XML 태그 값 추출 헬퍼 ─────────────────────────────────
function getTag(block: string, tag: string): string {
  const m = block.match(
    new RegExp('<' + tag + '[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + tag + '>', 'i')
  );
  return m ? m[1].trim() : '';
}

function getAttr(block: string, tag: string, attr: string): string {
  const m = block.match(
    new RegExp('<' + tag + '[^>]*' + attr + '="([^"]*)"', 'i')
  );
  return m ? m[1] : '';
}

// ── RSS XML 파싱 ──────────────────────────────────────────
function parseRSS(xml: string): FinanceNewsItem[] {
  const items: FinanceNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
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

// ── GET /api/finance/categories ───────────────────────────
finance.get('/categories', function(c) {
  return c.json({ success: true, data: CATEGORIES });
});

// ── GET /api/finance?category=all&limit=20 ────────────────
finance.get('/', async function(c) {
  const category = c.req.query('category') ?? 'all';
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '20'), 50);

  const feedUrl = RSS_FEEDS[category];
  if (!feedUrl) {
    return c.json({ success: false, message: '유효하지 않은 카테고리입니다.' }, 400);
  }

  const cached = cache[category];
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return c.json({ success: true, cached: true, data: cached.data.slice(0, limit) });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 MorningDock/1.0' },
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const xml   = await response.text();
    const items = parseRSS(xml);

    cache[category] = { data: items, time: Date.now() };

    return c.json({ success: true, cached: false, data: items.slice(0, limit) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Finance RSS] fetch 실패 (' + category + '):', message);
    return c.json({ success: false, message: 'RSS 불러오기 실패', error: message }, 500);
  }
});

export default finance;