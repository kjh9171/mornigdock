import pool from './db'

export const fetchStockService = async () => {
  console.log('📈 CERT: Market Intelligence Scrutiny Operation - Stock Indices...')
  
  // 🔥 [증시 4대 전선 고착] 고정 심볼을 사용하여 프론트엔드와 완벽하게 합을 맞춤
  const stockItems = [
    {
      symbol: 'KOSPI',
      name: '코스피',
      price: 2615.31,
      change_val: -12.45,
      change_rate: -0.47,
      market_status: 'OPEN',
      ai_summary: '코스피는 외국인과 기관의 동반 매도세에 밀려 2610선으로 후퇴했습니다. 반도체 대장주들의 약세가 지수 하락을 주도하고 있으며, 금리 인하 기대감 후퇴가 심리적 압박으로 작용하고 있습니다.'
    },
    {
      symbol: 'KOSDAQ',
      name: '코스닥',
      price: 852.12,
      change_val: 3.15,
      change_rate: 0.37,
      market_status: 'OPEN',
      ai_summary: '코스닥은 이차전지 관련주의 반등에 힘입어 소폭 상승 중입니다. 개인 투자자들의 매수세가 유입되며 지수 하단을 지지하고 있으나, 상단 저항선 돌파를 위한 모멘텀은 부족한 상황입니다.'
    },
    {
      symbol: 'DJI',
      name: '다우존스',
      price: 39127.14,
      change_val: 456.80,
      change_rate: 1.18,
      market_status: 'CLOSED',
      ai_summary: '뉴욕 증시는 우량주 중심의 다우 지수가 사상 최고치를 경신하며 마감했습니다. 기업들의 견조한 실적 발표가 이어지며 경기 연착륙에 대한 확신이 시장 전반에 확산되었습니다.'
    },
    {
      symbol: 'NASDAQ',
      name: '나스닥',
      price: 16274.94,
      change_val: 124.68,
      change_rate: 0.77,
      market_status: 'CLOSED',
      ai_summary: '기술주 중심의 나스닥은 AI 반도체 수요 폭증 기대감에 상승세를 이어갔습니다. 특히 엔비디아를 필두로 한 AI 관련주들이 시장의 주인공 역할을 톡톡히 하고 있습니다.'
    }
  ]

  for (const item of stockItems) {
    await pool.query(
      `INSERT INTO stocks (symbol, name, price, change_val, change_rate, market_status, ai_summary, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (symbol) DO UPDATE SET 
       price = EXCLUDED.price, 
       change_val = EXCLUDED.change_val, 
       change_rate = EXCLUDED.change_rate, 
       market_status = EXCLUDED.market_status, 
       ai_summary = EXCLUDED.ai_summary, 
       updated_at = NOW()`,
      [item.symbol, item.name, item.price, item.change_val, item.change_rate, item.market_status, item.ai_summary]
    )
  }
  
  console.log('✅ CERT: 4 Major Market indices are now locked and loaded in the command vault.')
}
