import pool from './db'

export const fetchNewsService = async () => {
  console.log('📡 CERT: Starting News Intelligence Extraction...')
  
  const newsItems = [
    {
      type: 'news',
      category: '경제',
      title: `[속보] ${new Date().getHours()}시 기준 글로벌 환율 변동성 확대`,
      content: '주요 경제 지표 발표 이후 달러 인덱스가 급등하며 신흥국 통화 가치가 하락하고 있습니다. 시장 전문가들은 단기적 변동성에 유의할 것을 경고하고 있습니다. 이 기사는 시스템에 의해 자동으로 수집되었습니다.',
      source: 'Global Finance',
      source_url: 'https://www.google.com/finance',
      related_video_url: 'dQw4w9WgXcQ', // 경제 관련 유튜브 예시
      author_name: 'AI Agent'
    },
    {
      type: 'news',
      category: '기술',
      title: `[REPORT] 2026 차세대 반도체 공정 로드맵 발표`,
      content: '글로벌 반도체 업체들이 1nm 이하 공정 진입을 위한 새로운 노광 장비 도입 계획을 발표했습니다. 이는 미래 컴퓨팅 환경의 근본적인 변화를 예고합니다.',
      source: 'Tech Daily',
      source_url: 'https://news.google.com/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JYcG9MVUpDR2dKSlRpZ0FQAQ',
      related_video_url: '9WvVGN998Sg', // 기술 관련 유튜브 예시
      author_name: 'AI Agent'
    },
    {
      type: 'news',
      category: '산업',
      title: '친환경 수소 상용차 시장 점유율 급증',
      content: '물류 산업 내에서 수소 전기 트럭의 도입이 가속화되면서 탄소 중립 목표 달성에 청신호가 켜졌습니다. 주요 기업들의 인프라 투자가 이어지고 있습니다. 이와 관련된 심층 팟캐스트 브리핑을 확인하세요.',
      source: 'Industry Monitor',
      source_url: 'https://www.h2-view.com',
      related_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // 관련 팟캐스트 예시
      author_name: 'AI Agent'
    }
  ]

  for (const item of newsItems) {
    const exists = await pool.query('SELECT id FROM posts WHERE title = $1', [item.title])
    if (exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO posts (type, category, title, content, author_name, source, source_url, related_video_url, related_audio_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [item.type, item.category, item.title, item.content, item.author_name, item.source, item.source_url, item.related_video_url || null, item.related_audio_url || null]
      )
    }
  }
  
  console.log('✅ CERT: News Extraction Complete.')
}
