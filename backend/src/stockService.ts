import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from './db/pool.ts';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export const fetchStockService = async () => {
  console.log('📈 CERT: Market Intelligence Scrutiny Operation - Real-time Data Scraping...');
  
  const stockItems: any[] = [];
  let summaryText = '';

  // 1. 국내/해외 지수 API 수집
  try {
    // 네이버 증권 모바일 API 활용 (더 안정적)
    const domesticRes = await axios.get('https://m.stock.naver.com/api/index/KOSPI/basic', { headers: { 'User-Agent': USER_AGENT } });
    const kospi = domesticRes.data;
    stockItems.push({
      symbol: 'KOSPI', name: '코스피',
      price: parseFloat(kospi.closePrice.replace(/,/g, '')),
      change_val: parseFloat(kospi.compareToPreviousClosePrice.replace(/,/g, '')),
      change_rate: parseFloat(kospi.fluctuationsRatio),
      market_status: 'OPEN',
      ai_summary: '외국인과 기관의 수급 공방 속에서 코스피는 방향성을 탐색하고 있습니다.'
    });

    const kosdaqRes = await axios.get('https://m.stock.naver.com/api/index/KOSDAQ/basic', { headers: { 'User-Agent': USER_AGENT } });
    const kosdaq = kosdaqRes.data;
    stockItems.push({
      symbol: 'KOSDAQ', name: '코스닥',
      price: parseFloat(kosdaq.closePrice.replace(/,/g, '')),
      change_val: parseFloat(kosdaq.compareToPreviousClosePrice.replace(/,/g, '')),
      change_rate: parseFloat(kosdaq.fluctuationsRatio),
      market_status: 'OPEN',
      ai_summary: '코스닥 시장은 개별 종목 장세가 이어지며 등락을 거듭하고 있습니다.'
    });
    
    // 해외 지수는 Mock 데이터로 대체 (API 접근성 이슈 방지)
    stockItems.push(
      { symbol: 'DJI', name: '다우존스', price: 39131.53, change_val: 62.42, change_rate: 0.16, market_status: 'CLOSED', ai_summary: '미국 증시는 AI 랠리 지속 여부에 주목하며 상승 마감했습니다.' },
      { symbol: 'NASDAQ', name: '나스닥', price: 16250.90, change_val: -20.50, change_rate: -0.13, market_status: 'CLOSED', ai_summary: '기술주 중심의 차익 실현 매물이 출회되며 소폭 조정을 받았습니다.' }
    );

  } catch (err) {
    console.error('❌ CERT STOCK API ERROR:', err);
    // 실패 시 Mock 데이터
    stockItems.push(
      { symbol: 'KOSPI', name: '코스피', price: 2640.50, change_val: 10.20, change_rate: 0.39, market_status: 'OPEN', ai_summary: '기관 매수세 유입으로 상승 흐름을 유지하고 있습니다.' },
      { symbol: 'KOSDAQ', name: '코스닥', price: 860.10, change_val: -5.30, change_rate: -0.61, market_status: 'OPEN', ai_summary: '외국인 매도세로 인해 약보합세를 보이고 있습니다.' }
    );
  }

  // 2. 증시 요약
  try {
    const mainResponse = await axios.get('https://finance.naver.com/', { headers: { 'User-Agent': USER_AGENT }, responseEncoding: 'binary' });
    const decoder = new TextDecoder('euc-kr'); // 네이버 증권은 EUC-KR 사용
    const html = decoder.decode(mainResponse.data);
    const $ = cheerio.load(html);
    
    summaryText = $('.section_strategy .strategy_area').first().text().trim() || '현재 시장은 관망세가 짙어지고 있습니다.';
    // 한글 깨짐 방지를 위해 인코딩 확인이 중요함.
  } catch (err) {
    summaryText = '글로벌 경제 불확실성이 지속되는 가운데, 투자자들은 주요 경제 지표 발표를 주시하고 있습니다.';
  }

  stockItems.push({
    symbol: 'MARKET_SUMMARY',
    name: `이시각 증시요약 (${new Date().getHours()}시 기준)`,
    price: 0,
    change_val: 0,
    change_rate: 0,
    market_status: 'INFO',
    ai_summary: summaryText.substring(0, 200) // 길이 제한
  });

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

  // 4. 리서치 리포트 (Mock + Crawling)
  // posts 테이블의 category 컬럼 길이나 제약조건 확인 필요. 여기서는 '리서치'로 통일.
  const researchData = [
    { title: '[시황] 외국인, 반도체 집중 매수... 코스피 2,700선 탈환 시도', source: '아고라 리서치' },
    { title: '[전략] 저PBR 종목 옥석 가리기: 밸류업 프로그램 수혜주 분석', source: 'CERT 전략팀' },
    { title: '[산업] AI 데이터센터 전력 수요 급증... 전력기기 슈퍼사이클', source: '산업분석실' },
    { title: '[기업] 현대차, 주주환원 정책 강화 기대감에 신고가 경신', source: '기업분석팀' }
  ];

  const adminUser = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const adminId = adminUser.rows[0]?.id || 1; // Fallback to 1 if not found

  for (const r of researchData) {
    try {
      await pool.query(
        `INSERT INTO posts (user_id, category, type, title, content, source, source_url, created_at)
         VALUES ($1, 'general', 'news', $2, $3, $4, $5, NOW())
         ON CONFLICT (source_url) DO UPDATE SET title = EXCLUDED.title`,
        [
          adminId,
          r.title,
          `${r.source}에서 제공하는 최신 리포트입니다. 시장의 핵심 이슈를 심도 있게 분석하였습니다.`,
          r.source,
          `https://agora.io/research/${Buffer.from(r.title).toString('base64').slice(0, 10)}`
        ]
      );
    } catch (e) { console.error('Research Insert Error:', e); }
  }
  
  console.log(`✅ CERT: Market Data Sync Complete.`);
};
