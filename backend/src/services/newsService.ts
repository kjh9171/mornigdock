import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from '../db/pool.ts';
import { getSystemSetting } from '../utils/settings.ts';

/**
 * 뉴스 URL로부터 본문 내용을 정밀하게 크롤링합니다.
 */
export async function scrapeArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(response.data);
    $('script, style, iframe, ins, .ads, #ads').remove();

    let content = $('#articleBodyContents, #articleBody, #newsct_article, .article_view, .article_body, .content, article').text().trim();
    if (!content || content.length < 100) {
      content = $('p').map((_, el) => $(el).text()).get().join('\n').trim();
    }
    return content.slice(0, 5000); 
  } catch (err) {
    return '';
  }
}

/**
 * 네이버 뉴스 검색 API 및 RSS 피드로부터 최신 뉴스를 수집합니다.
 */
export async function fetchLatestNews(): Promise<number> {
  let savedCount = 0;

  // 시스템 설정에서 최신 API 키 확보 (DB 우선)
  const naverClientId = await getSystemSetting('naver_client_id');
  const naverClientSecret = await getSystemSetting('naver_client_secret');

  // 1. 네이버 뉴스 검색 API 활용 (속보 위주)
  if (naverClientId && naverClientSecret) {
    try {
      console.log('[NewsService] 네이버 API를 통한 속보 수집 중...');
      const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
        params: {
          query: '연합뉴스', 
          display: 20,
          sort: 'sim'
        },
        headers: {
          'X-Naver-Client-Id': naverClientId,
          'X-Naver-Client-Secret': naverClientSecret
        }
      });

      const items = response.data.items || [];
      for (const item of items) {
        try {
          await query(
            `INSERT INTO news (title, description, url, source_name, category, published_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (url) DO NOTHING`,
            [
              item.title.replace(/<[^>]*>?/gm, ''), 
              item.description.replace(/<[^>]*>?/gm, ''),
              item.link,
              '네이버 뉴스',
              'general',
              item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
            ]
          );
          savedCount++;
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('[NewsService] 네이버 API 수집 실패:', err.message);
    }
  }

  // 2. 기존 RSS 피드 수집 (백업용)
  const rssFeeds = [
    { name: '연합뉴스 속보', url: 'https://www.yna.co.kr/rss/news.xml', category: 'general' },
    { name: '구글 뉴스', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko', category: 'general' }
  ];

  for (const feed of rssFeeds) {
    try {
      const response = await axios.get(feed.url, { timeout: 10000 });
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $('item').toArray().slice(0, 10);

      for (const item of items) {
        const title = $(item).find('title').text().trim();
        const link = $(item).find('link').text().trim();
        const description = $(item).find('description').text().trim();
        const pubDate = $(item).find('pubDate').text().trim();

        try {
          await query(
            `INSERT INTO news (title, description, url, source_name, category, published_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (url) DO NOTHING`,
            [title, description, link, feed.name, feed.category, pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()]
          );
          savedCount++;
        } catch (e) {}
      }
    } catch (err: any) {
      console.error(`[NewsService] ${feed.name} RSS 수집 실패:`, err.message);
    }
  }

  console.log(`[NewsService] 총 ${savedCount}개의 첩보 수집 완료`);
  return savedCount;
}
