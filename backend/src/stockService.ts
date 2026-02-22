import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from './db/pool.ts';
import { analyzeNewsWithGemini } from './services/geminiService.ts';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export const fetchStockService = async () => {
  console.log('📈 CERT: Market Intelligence Scrutiny Operation - Finance News & Index Sync...');
  
  const stockItems: any[] = [];

  // 1. 국내/해외 지수 실시간 수집
  try {
    const domesticRes = await axios.get('https://m.stock.naver.com/api/index/KOSPI/basic', { headers: { 'User-Agent': USER_AGENT } });
    const kospi = domesticRes.data;
    stockItems.push({
      symbol: 'KOSPI', name: '코스피',
      price: parseFloat(kospi.closePrice.replace(/,/g, '')),
      change_val: parseFloat(kospi.compareToPreviousClosePrice.replace(/,/g, '')),
      change_rate: parseFloat(kospi.fluctuationsRatio),
      market_status: 'OPEN',
      ai_summary: '코스피 지수가 글로벌 경제 지표를 주시하며 변동성을 보이고 있습니다.'
    });

    const kosdaqRes = await axios.get('https://m.stock.naver.com/api/index/KOSDAQ/basic', { headers: { 'User-Agent': USER_AGENT } });
    const kosdaq = kosdaqRes.data;
    stockItems.push({
      symbol: 'KOSDAQ', name: '코스닥',
      price: parseFloat(kosdaq.closePrice.replace(/,/g, '')),
      change_val: parseFloat(kosdaq.compareToPreviousClosePrice.replace(/,/g, '')),
      change_rate: parseFloat(kosdaq.fluctuationsRatio),
      market_status: 'OPEN',
      ai_summary: '코스닥 시장은 개별 테마주 중심의 순환매 장세가 이어지고 있습니다.'
    });
  } catch (err) {
    console.error('❌ CERT STOCK API ERROR:', err);
  }

  // 2. 🔥 네이버 금융 뉴스 정밀 수집 및 AI 분석
  try {
    console.log('[FinanceService] 네이버 금융 주요 뉴스 수집 중...');
    const newsResponse = await axios.get('https://finance.naver.com/news/mainnews.naver', { 
      headers: { 'User-Agent': USER_AGENT },
      responseEncoding: 'binary' 
    });
    const decoder = new TextDecoder('euc-kr');
    const html = decoder.decode(newsResponse.data);
    const $ = cheerio.load(html);
    
    const newsItems = $('.main_news .block_sub li, .main_news .main_article').toArray().slice(0, 5);

    for (const el of newsItems) {
      const title = $(el).find('a').text().trim();
      const link = 'https://finance.naver.com' + $(el).find('a').attr('href');
      
      if (!title || !link) continue;

      // 이미 수집된 뉴스인지 확인
      const check = await pool.query('SELECT id FROM news WHERE url = $1', [link]);
      if (check.rows.length === 0) {
        // Gemini AI 분석 (제목과 링크만으로도 분석 가능하도록 설계)
        const analysis = await analyzeNewsWithGemini(title, '네이버 금융 주요 뉴스입니다.');
        
        await pool.query(
          `INSERT INTO news (title, description, url, source_name, category, published_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [title, analysis.summary, link, '네이버 금융', 'finance']
        );

        // 상세 분석 결과 저장
        const lastNewsId = await pool.query('SELECT id FROM news WHERE url = $1', [link]);
        await pool.query(
          `INSERT INTO ai_reports (news_id, summary, impact, advice)
           VALUES ($1, $2, $3, $4)`,
          [lastNewsId.rows[0].id, analysis.summary, analysis.impact, analysis.advice]
        );
      }
    }

    // 종합 시황 분석 결과 업데이트 (지수 요약용)
    const marketSummary = await analyzeNewsWithGemini("오늘의 증시 상황 요약", "코스피와 코스닥 지수의 현재 흐름을 분석해 주세요.");
    stockItems.push({
      symbol: 'MARKET_SUMMARY',
      name: `이시각 증시요약 (${new Date().getHours()}시 기준)`,
      price: 0, change_val: 0, change_rate: 0,
      market_status: 'INFO',
      ai_summary: marketSummary.summary
    });

  } catch (err) {
    console.error('❌ Finance News Scraping Error:', err);
  }

  // 3. DB 저장
  for (const item of stockItems) {
    try {
      await pool.query(
        `INSERT INTO stocks (symbol, name, price, change_val, change_rate, market_status, ai_summary, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (symbol) DO UPDATE SET 
         name = EXCLUDED.name, price = EXCLUDED.price, change_val = EXCLUDED.change_val, 
         change_rate = EXCLUDED.change_rate, ai_summary = EXCLUDED.ai_summary, updated_at = NOW()`,
        [item.symbol, item.name, item.price, item.change_val, item.change_rate, item.market_status, item.ai_summary]
      );
    } catch (e) { console.error('DB Insert Error:', e); }
  }

  console.log(`✅ CERT: Finance Intelligence Sync Complete.`);
};
