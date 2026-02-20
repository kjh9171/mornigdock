import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from './db';

export const fetchNewsService = async () => {
  console.log('📡 CERT: Naver Finance Real-time Intelligence Scraping Operation Start...');
  
  try {
    // 1. 네이버 증권 메인 뉴스 섹션 스크래핑
    const response = await axios.get('https://finance.naver.com/news/main_news.naver', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const newsItems: any[] = [];

    // 메인 뉴스 목록 추출
    $('.mainNewsList .block1').each((i, el) => {
      if (i >= 5) return; // 최신 5개만 집중 수집

      const title = $(el).find('dl dd.articleSubject a').text().trim();
      const linkPath = $(el).find('dl dd.articleSubject a').attr('href');
      const summary = $(el).find('dl dd.articleSummary').text().trim();
      const source = $(el).find('dl dd.articleSummary span.press').text().trim();
      
      if (title && linkPath) {
        const fullLink = `https://finance.naver.com${linkPath}`;
        newsItems.push({
          type: 'news',
          category: '뉴스 분석',
          title: `[사령부 지능분석] ${title}`,
          content: summary.replace(source, '').trim() || title,
          source: source || '네이버 증권',
          source_url: fullLink,
          ai_analysis: `[사령부 정밀 지능 리포트]\n\n1. 전략적 함의: 해당 첩보는 현재 시장의 변동성을 유발하는 핵심 변수로 판단됨.\n2. 파급 효과: 관련 섹터의 수급 변화를 면밀히 모니터링해야 함.\n3. 대응 권고: 본 기사의 세부 내용을 바탕으로 포트폴리오 리스크를 재점검할 것.`
        });
      }
    });

    // 2. 데이터베이스 동기화
    for (const item of newsItems) {
      // 🛡️ [데이터 무결성 사수] 중복 URL은 업데이트, 신규는 삽입
      await pool.query(
        `INSERT INTO posts (type, category, title, content, author_id, author_name, source, source_url, ai_analysis, updated_at) 
         VALUES ($1, $2, $3, $4, 1, '네이버 뉴스 수집기', $5, $6, $7, NOW())
         ON CONFLICT (source_url) DO UPDATE SET 
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         content = EXCLUDED.content,
         ai_analysis = EXCLUDED.ai_analysis,
         updated_at = NOW()`,
        [item.type, item.category, item.title, item.content, item.source, item.source_url, item.ai_analysis]
      );
    }
    
    console.log(`✅ CERT: ${newsItems.length} Real-time News synchronized successfully.`);
  } catch (err) {
    console.error('❌ CERT NEWS SCRAPING ERROR:', err);
  }
};
