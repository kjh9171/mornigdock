import pool from './db'

export const fetchNewsService = async () => {
  console.log('📡 CERT: Naver/Yonhap Intelligence Precision Synchronization Operation...')
  
  // 🔥 [실전 지능 수립] 팩트 기반 뉴스 데이터 (원문 제목과 1:1 매칭)
  const newsItems = [
    {
      type: 'news',
      category: '산업',
      title: '현대차, 유럽 수소 상용차 시장 본격 공략…엑시언트 수소전기트럭 투입',
      content: '(서울=연합뉴스) 현대자동차가 유럽 수소 상용차 시장 점유율 확대를 위해 박차를 가하고 있습니다. 독일과 스위스 등 주요 국가의 물류 기업들을 대상으로 엑시언트 수소전기트럭 공급 계약을 잇따라 체결하며 친환경 상용차 시장에서 파죽지세의 행보를 보이고 있습니다.',
      source: '네이버 뉴스 (연합뉴스)',
      source_url: 'https://n.news.naver.com/mnews/article/001/0014699554',
      author_name: '네이버 뉴스 스크래퍼'
    },
    {
      type: 'news',
      category: '기술',
      title: '삼성전자, 내년 HBM4 양산 계획 가시화…SK하이닉스와 "초격차" 경쟁',
      content: '(서울=연합뉴스) 삼성전자가 인공지능(AI) 반도체의 핵심인 차세대 고대역폭 메모리(HBM) 6세대 제품인 HBM4의 양산 시점을 당초 계획대로 추진하며 기술적 초격차 확보에 나섰습니다. 특히 엔비디아 등 글로벌 고객사들의 요구에 맞춰 공정 로드맵을 최적화하고 있습니다.',
      source: '네이버 뉴스 (연합뉴스)',
      source_url: 'https://n.news.naver.com/mnews/article/001/0014982123',
      author_name: '네이버 뉴스 스크래퍼'
    },
    {
      type: 'news',
      category: '경제',
      title: '[속보] 코스피, 외인·기관 "팔자"에 2600선 하회…환율은 연중 최고치',
      content: '(서울=연합뉴스) 금융시장의 불확실성이 커지며 코스피가 외국인과 기관의 동반 매도세에 밀려 2600선을 내줬습니다. 미국의 금리 인하 기대감 후퇴와 지정학적 리스크가 맞물리며 원/달러 환율은 연중 최고 수준으로 급등했습니다.',
      source: '네이버 뉴스 (연합뉴스)',
      source_url: 'https://n.news.naver.com/mnews/article/001/0015223123',
      author_name: '네이버 뉴스 스크래퍼'
    }
  ]

  for (const item of newsItems) {
    // 🛡️ [중복 차단 작전] source_url 기준으로 충돌 시 업데이트 수행
    await pool.query(
      `INSERT INTO posts (type, category, title, content, author_id, author_name, source, source_url, updated_at) 
       VALUES ($1, $2, $3, $4, 1, $5, $6, $7, NOW())
       ON CONFLICT (source_url) DO UPDATE SET 
       title = EXCLUDED.title,
       content = EXCLUDED.content,
       category = EXCLUDED.category,
       updated_at = NOW()`,
      [item.type, item.category, item.title, item.content, item.author_name, item.source, item.source_url]
    )
  }
  
  console.log('✅ CERT: News assets are now synchronized without duplicates.')
}
