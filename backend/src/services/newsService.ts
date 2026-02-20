import axios from 'axios';
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
          country: 'kr', // 한국 뉴스 타겟팅
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
      title: '글로벌 증시, 경제 불확실성 속에서 회복 조짐 가속화',
      description: '전 세계 금융 시장은 주요국들의 혼조세 경제 지표를 소화하며 신중한 상승세를 보이고 있습니다.',
      url: `https://mock-news.agora.io/markets-recovery-v1`,
      category: 'business',
      source_name: '아고라 인텔리전스',
    },
    {
      title: 'AI 기술 혁신, 2025년 산업 전반의 지형도를 바꾸다',
      description: '인공지능 기술이 헬스케어부터 제조까지 전 산업 분야를 혁신하며 매주 새로운 응용 사례가 쏟아지고 있습니다.',
      url: `https://mock-news.agora.io/ai-breakthrough-v1`,
      category: 'technology',
      source_name: '테크 위클리',
    },
    {
      title: '지정학적 변화에 따른 새로운 글로벌 무역 동맹 형성',
      description: '세계 강대국 간의 역학 관계가 변화함에 따라 국가들이 새로운 경제 파트너십을 구축하고 있습니다.',
      url: `https://mock-news.agora.io/geopolitics-v1`,
      category: 'general',
      source_name: '글로벌 리포트',
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
