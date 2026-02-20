import axios from 'axios';
import { query } from '../db/pool.js';

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
 * NewsAPI.org에서 최신 뉴스를 가져와 DB에 저장합니다.
 * @returns 저장된 뉴스 수
 */
export async function fetchLatestNews(): Promise<number> {
  if (!NEWS_API_KEY) {
    console.warn('[NewsService] NEWS_API_KEY가 설정되지 않아 모의 데이터를 생성합니다.');
    return insertMockNews();
  }

  const categories = ['business', 'technology', 'general'];
  let savedCount = 0;

  for (const category of categories) {
    try {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          category,
          language: 'en',
          pageSize: Math.floor(MAX_PER_FETCH / categories.length),
          apiKey: NEWS_API_KEY,
        },
        timeout: 10000,
      });

      const articles: NewsApiArticle[] = response.data?.articles ?? [];

      for (const article of articles) {
        if (!article.title || !article.url) continue;
        if (article.title === '[Removed]') continue;

        try {
          await query(
            `INSERT INTO news (title, description, content, url, image_url, source_name, category, published_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (url) DO NOTHING`,
            [
              article.title.slice(0, 500),
              article.description?.slice(0, 1000) ?? null,
              article.content?.slice(0, 5000) ?? null,
              article.url,
              article.urlToImage ?? null,
              article.source?.name ?? null,
              category,
              article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
            ]
          );
          savedCount++;
        } catch (insertErr: any) {
          // URL 중복 등 개별 오류는 무시
          if (!insertErr.message.includes('unique')) {
            console.error('[NewsService] 뉴스 삽입 오류:', insertErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error(`[NewsService] ${category} 카테고리 수집 실패:`, err.message);
    }
  }

  console.log(`[NewsService] ${savedCount}개 뉴스 수집 완료`);
  return savedCount;
}

async function insertMockNews(): Promise<number> {
  const mockArticles = [
    {
      title: 'Global Markets Show Signs of Recovery Amid Economic Uncertainty',
      description: 'Financial markets worldwide are experiencing a cautious uptick as investors digest mixed economic signals from major economies.',
      url: `https://mock-news.example.com/markets-recovery-${Date.now()}`,
      category: 'business',
      source_name: 'Agora Intelligence',
    },
    {
      title: 'AI Technology Breakthroughs Reshape Industries in 2025',
      description: 'Artificial intelligence continues to transform sectors from healthcare to manufacturing, with new applications emerging weekly.',
      url: `https://mock-news.example.com/ai-breakthrough-${Date.now()}`,
      category: 'technology',
      source_name: 'Tech Weekly',
    },
    {
      title: 'Geopolitical Shifts Drive New Trade Alliances Worldwide',
      description: 'Nations are forging new economic partnerships as global power dynamics continue to evolve in unprecedented ways.',
      url: `https://mock-news.example.com/geopolitics-${Date.now()}`,
      category: 'general',
      source_name: 'Global Report',
    },
  ];

  let count = 0;
  for (const article of mockArticles) {
    try {
      await query(
        `INSERT INTO news (title, description, url, category, source_name, published_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (url) DO NOTHING`,
        [article.title, article.description, article.url, article.category, article.source_name]
      );
      count++;
    } catch {
      // 중복 무시
    }
  }
  return count;
}
