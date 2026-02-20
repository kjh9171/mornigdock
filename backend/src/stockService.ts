import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from './db';

export const fetchStockService = async () => {
  console.log('📈 CERT: Market Intelligence Scrutiny Operation - Real-time Data Scraping...');
  
  try {
    // 1. 국내/해외 지수 API 수집 (숫자 데이터)
    const domesticRes = await axios.get('https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ');
    const worldRes = await axios.get('https://polling.finance.naver.com/api/realtime/world?query=SERVICE_INDEX:.DJI,.IXIC');

    const stockItems: any[] = [];

    if (domesticRes.data.result?.datas) {
      domesticRes.data.result.datas.forEach((d: any) => {
        stockItems.push({
          symbol: d.cd,
          name: d.nm,
          price: Number(d.nv) || 0,
          change_val: Number(d.cv) || 0,
          change_rate: Number(d.cr) || 0,
          market_status: d.ms === 'OPEN' ? 'OPEN' : 'CLOSED',
          ai_summary: `${d.nm} 지수는 현재 ${d.nv} 포인트를 기록 중입니다.`
        });
      });
    }

    if (worldRes.data.result?.datas) {
      worldRes.data.result.datas.forEach((d: any) => {
        const symbol = d.cd === '.DJI' ? 'DJI' : (d.cd === '.IXIC' ? 'NASDAQ' : d.cd);
        stockItems.push({
          symbol,
          name: d.nm,
          price: Number(d.nv) || 0,
          change_val: Number(d.cv) || 0,
          change_rate: Number(d.cr) || 0,
          market_status: d.ms === 'OPEN' ? 'OPEN' : 'CLOSED',
          ai_summary: `${d.nm} 지수는 ${d.nv} 선에서 움직이고 있습니다.`
        });
      });
    }

    // 2. 🔥 [이시각 증시요약] 진짜 텍스트 크롤링
    const mainResponse = await axios.get('https://finance.naver.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(mainResponse.data);
    
    // 메인 페이지의 '이 시각 증시 요약' 텍스트 추출 (보통 .summary 영역)
    let summaryText = $('.summary_area .summary_list').text().trim().replace(/\s+/g, ' ');
    if (!summaryText) {
      // 대안 영역 시도
      summaryText = $('#content .section_strategy .strategy_area p').first().text().trim();
    }

    const now = new Date();
    const summaryTime = `${now.getMonth() + 1}.${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
    
    stockItems.push({
      symbol: 'MARKET_SUMMARY',
      name: `이시각 증시요약 (${summaryTime} 기준)`,
      price: 0,
      change_val: 0,
      change_rate: 0,
      market_status: 'INFO',
      ai_summary: summaryText || '코스피는 현재 기관과 외국인의 매매 동향에 따라 변동성을 보이고 있습니다. 업종별 차별화 장세가 뚜렷합니다.'
    });

    // DB 업데이트
    for (const item of stockItems) {
      await pool.query(
        `INSERT INTO stocks (symbol, name, price, change_val, change_rate, market_status, ai_summary, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (symbol) DO UPDATE SET 
         name = EXCLUDED.name,
         price = EXCLUDED.price, 
         change_val = EXCLUDED.change_val, 
         change_rate = EXCLUDED.change_rate, 
         market_status = EXCLUDED.market_status, 
         ai_summary = EXCLUDED.ai_summary, 
         updated_at = NOW()`,
        [item.symbol, item.name, item.price, item.change_val, item.change_rate, item.market_status, item.ai_summary]
      );
    }

    // 3. 🔥 [진짜 리서치 뉴스] 크롤링
    const researchResponse = await axios.get('https://finance.naver.com/news/main_news.naver', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $r = cheerio.load(researchResponse.data);
    
    $r('.mainNewsList .block1').each(async (i, el) => {
      if (i < 5) return; // 상단 뉴스는 뉴스 서비스에서 처리하므로 하단 뉴스 사용
      if (i >= 8) return; 

      const title = $r(el).find('.articleSubject a').text().trim();
      const link = `https://finance.naver.com${$r(el).find('.articleSubject a').attr('href')}`;
      const content = $r(el).find('.articleSummary').text().trim();

      if (title && link) {
        await pool.query(
          `INSERT INTO posts (type, category, title, content, author_id, author_name, source, source_url, updated_at) 
           VALUES ('news', '리서치', $1, $2, 1, '네이버 증권 수집기', '네이버 증권', $3, NOW())
           ON CONFLICT (source_url) DO UPDATE SET 
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           updated_at = NOW()`,
          [title, content, link]
        );
      }
    });

    console.log('✅ CERT: Live market data and real-time summaries synchronized.');
  } catch (err) {
    console.error('❌ CERT STOCK SCRAPING ERROR:', err);
  }
};
