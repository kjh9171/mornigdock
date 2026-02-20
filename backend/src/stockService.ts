import pool from './db'

export const fetchStockService = async () => {
  console.log('📈 CERT: Market Intelligence Scrutiny Operation - Real-time Stock Indices...')
  
  try {
    // 1. 국내 증시 수집 (KOSPI, KOSDAQ)
    const domesticRes = await fetch('https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ')
    const domesticData = await domesticRes.json()
    
    // 2. 해외 증시 수집 (DJI, NASDAQ)
    const worldRes = await fetch('https://polling.finance.naver.com/api/realtime/world?query=SERVICE_INDEX:.DJI,.IXIC')
    const worldData = await worldRes.json()

    const stockItems: any[] = []

    // 국내 데이터 매핑
    if (domesticData.result?.datas) {
      domesticData.result.datas.forEach((d: any) => {
        const price = d.nv / 100
        const change_val = d.cv / 100
        const change_rate = d.cr
        const symbol = d.cd
        const name = d.nm
        const status = d.ms === 'OPEN' ? 'OPEN' : 'CLOSED'
        
        stockItems.push({
          symbol,
          name,
          price,
          change_val,
          change_rate,
          market_status: status,
          ai_summary: `${name} 지수는 현재 ${price.toLocaleString()} 포인트를 기록 중입니다. 전일 대비 ${Math.abs(change_val)} (${change_rate}%) ${change_val >= 0 ? '상승' : '하락'}한 추세를 보이고 있으며, 시장의 ${status === 'OPEN' ? '실시간 수급 상황이 변동성' : '마감 결과가 향후 지지선'}에 영향을 미칠 것으로 분석됩니다.`
        })
      })
    }

    // 해외 데이터 매핑
    if (worldData.result?.datas) {
      worldData.result.datas.forEach((d: any) => {
        const price = d.nv / 100
        const change_val = d.cv / 100
        const change_rate = d.cr
        const symbol = d.cd === '.DJI' ? 'DJI' : (d.cd === '.IXIC' ? 'NASDAQ' : d.cd)
        const name = d.nm
        const status = d.ms === 'OPEN' ? 'OPEN' : 'CLOSED'

        stockItems.push({
          symbol,
          name,
          price,
          change_val,
          change_rate,
          market_status: status,
          ai_summary: `${name} 지수는 ${price.toLocaleString()} 선에서 ${status === 'OPEN' ? '움직이고' : '마감되었'}습니다. 글로벌 매크로 지표와 금리 향방에 따른 기술주들의 반응이 ${change_val >= 0 ? '긍정적' : '보수적'}인 흐름을 견인하고 있는 것으로 관측됩니다.`
        })
      })
    }

    // DB 업데이트
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
    
    console.log('✅ CERT: Real-time market indices successfully synchronized from Naver Finance.')
  } catch (err) {
    console.error('❌ CERT STOCK FETCH ERROR:', err)
  }
}
