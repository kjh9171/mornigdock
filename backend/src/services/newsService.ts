import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from '../db/pool.ts';

const NEWS_API_KEY = process.env.NEWS_API_KEY ?? '';
const MAX_PER_FETCH = 20;

interface NewsApiArticle {
  title:       string;
  description: string | null;
  content:     string | null;
  url:         string;
  urlToImage:  string | null;
  source:      { name: string };
  publishedAt: string;
}

/**
 * 뉴스 URL로부터 본문 내용을 정밀하게 크롤링합니다.
 * (네이버, 구글 뉴스 등 주요 매체의 본문 태그를 자동으로 탐색합니다.)
 */
export async function scrapeArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(response.data);
    
    // 불필요한 태그 제거 (광고, 스크립트 등)
    $('script, style, iframe, ins, .ads, #ads').remove();

    // 주요 뉴스 매체 본문 태그 후보군 탐색
    let content = $('#articleBodyContents, #articleBody, #newsct_article, .article_view, .article_body, .content, article').text().trim();
    
    // 만약 탐색에 실패하면 p 태그들을 모읍니다.
    if (!content || content.length < 100) {
      content = $('p').map((_, el) => $(el).text()).get().join('\n').trim();
    }

    return content.slice(0, 5000); // 분석에 필요한 적당량만 리턴
  } catch (err) {
    console.error(`[Scraper] 원문 수집 실패 (${url}):`, err);
    return '';
  }
}

/**
 * 연합뉴스 및 구글 뉴스 RSS 피드에서 최신 뉴스를 실시간으로 수집합니다.
 */
export async function fetchLatestNews(): Promise<number> {
  const rssFeeds = [
    { name: '연합뉴스 속보', url: 'https://www.yna.co.kr/rss/news.xml', category: 'general' },
    { name: '구글 뉴스 (대한민국)', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko', category: 'general' },
    { name: '네이버 경제', url: 'https://news.naver.com/main/rss/rss.nhn?sid1=101', category: 'business' },
    { name: '네이버 IT', url: 'https://news.naver.com/main/rss/rss.nhn?sid1=105', category: 'technology' }
  ];

  let savedCount = 0;

  for (const feed of rssFeeds) {
    try {
      console.log(`[NewsService] 수집 중: ${feed.name}...`);
      const response = await axios.get(feed.url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $('item').toArray().slice(0, 10); // 피드당 최신 10개만 수집

      for (const item of items) {
        const title = $(item).find('title').text().trim();
        const link = $(item).find('link').text().trim();
        const description = $(item).find('description').text().trim();
        const pubDate = $(item).find('pubDate').text().trim();
        const source = feed.name;

        if (!title || !link) continue;

        try {
          await query(
            `INSERT INTO news (title, description, url, source_name, category, published_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (url) DO UPDATE SET
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               published_at = EXCLUDED.published_at`,
            [
              title.slice(0, 500),
              description.slice(0, 1000),
              link,
              source,
              feed.category,
              pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
            ]
          );
          savedCount++;
        } catch (insertErr) {
          // 중복은 무시
        }
      }
    } catch (err: any) {
      console.error(`[NewsService] ${feed.name} 수집 실패:`, err.message);
    }
  }

  console.log(`[NewsService] 총 ${savedCount}개의 정밀 지능 데이터 동기화 완료`);
  return savedCount;
}

async function insertMockNews(): Promise<number> {
  // 실제 RSS 수집으로 대체되므로 하위 호환성을 위해 빈 함수로 유지하거나 RSS 수집을 호출합니다.
  return fetchLatestNews();
}

