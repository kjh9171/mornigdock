import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mornigdock',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('connect', () => console.log('✅ PostgreSQL 연결 성공'))
pool.on('error', (err) => console.error('❌ PostgreSQL 오류:', err))

export async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL DEFAULT 'board',
        category VARCHAR(50),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        pinned BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        thumbnail_url VARCHAR(500),
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        content TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT false,
        reported BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        url VARCHAR(1000) NOT NULL,
        thumbnail_url VARCHAR(500),
        author VARCHAR(200),
        category VARCHAR(100),
        duration VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        detail JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    `)
    // 샘플 뉴스 데이터
    const newsCount = await client.query("SELECT COUNT(*) FROM posts WHERE type='news'")
    if (parseInt(newsCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO posts (type,category,title,content,author_name,source,pinned,view_count) VALUES
        ('news','경제','연준, 금리 동결 결정…하반기 인하 기대','미국 연방준비제도(Fed)가 이번 FOMC 회의에서 기준금리를 현 수준으로 동결하기로 결정했다. 위원들은 인플레이션이 목표치(2%)를 향해 안정적으로 하락하고 있다고 평가하면서도, 추가 확신이 필요하다고 밝혔다. 시장에서는 올해 하반기 두 차례 금리 인하 가능성을 50% 이상으로 전망하고 있다. 달러는 소폭 약세를, 채권 수익률은 하락세를 보였다. 파월 의장은 "인플레이션 데이터가 개선되고 있지만 목표 달성까지는 더 많은 증거가 필요하다"고 강조했다.','Bloomberg Korea','Bloomberg',true,1842),
        ('news','기술','OpenAI, GPT-5 출시 일정 공식 발표…추론 능력 대폭 강화','OpenAI가 차세대 언어 모델 GPT-5의 상반기 내 출시를 공식 발표했다. 이번 모델은 복잡한 수학 문제 풀이와 코딩 능력이 전작 대비 40% 이상 향상될 것으로 알려졌다. 특히 멀티모달 기능이 강화돼 이미지·음성·영상을 통합 처리할 수 있게 된다. 구글의 Gemini Ultra와 Anthropic의 Claude 3.5와 본격적인 경쟁이 예고된다. 업계에서는 AI 모델 간 성능 격차가 빠르게 좁혀지고 있다는 분석이 나오고 있다.','TechCrunch','TechCrunch',false,2310),
        ('news','정치','한미 정상회담, 반도체·배터리 공급망 협력 강화 합의','한국과 미국 정상이 워싱턴 D.C.에서 정상회담을 가지고 첨단 반도체, 차세대 배터리, AI 분야의 공급망 협력을 대폭 강화하기로 합의했다. 양국은 핵심 광물 공동 개발과 우주·사이버 안보 분야 협력도 확대하기로 했다. 삼성전자, SK하이닉스, LG에너지솔루션 등 국내 대기업의 미국 투자가 더욱 탄력을 받을 것으로 분석된다.','연합뉴스','연합뉴스',false,987),
        ('news','글로벌','국제유가 배럴당 90달러 돌파…중동 리스크 재부각','중동 지역의 지정학적 긴장이 고조되면서 WTI 원유 선물이 배럴당 90달러를 넘어섰다. OPEC+ 감산 기조가 유지되는 가운데 공급 차질 우려가 겹치면서 에너지 시장 변동성이 확대되고 있다. 전문가들은 현 수준이 당분간 유지되거나 소폭 상승할 가능성을 경고하며, 국내 물가와 경상수지에 대한 영향을 주시하고 있다.','Reuters','Reuters',false,1124),
        ('news','산업','현대차, 전기차 판매 목표 15% 상향…아이오닉 라인업 확대','현대자동차그룹이 올해 연간 전기차 판매 목표를 기존 31만 대에서 36만 대로 상향 조정했다. 북미 시장에서 아이오닉 5·6의 판매 호조가 목표 상향의 주요 배경이 됐다. 하반기에는 아이오닉 9 SUV 출시도 예정돼 있어 라인업 확대가 기대된다. 테슬라의 중국산 모델 가격 인하에도 불구하고 현대차의 품질·브랜드 전략이 주효하고 있다는 분석이다.','한국경제','한국경제',false,765)
      `)
    }
    // 샘플 게시판 데이터
    const boardCount = await client.query("SELECT COUNT(*) FROM posts WHERE type='board'")
    if (parseInt(boardCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO posts (type,category,title,content,author_name,view_count) VALUES
        ('board','자유','오늘 주식 시장 어떻게 보시나요?','연준 금리 동결 이후 코스피가 반등했는데 이번 주 전망이 궁금합니다. 다들 어떻게 보고 계신지요?','김철수',142),
        ('board','질문','Docker Compose 처음 쓰는데 질문 있어요','docker-compose up 하면 자꾸 컨테이너가 죽는데 어떻게 해결하나요? 로그에는 exit code 1 이라고 나오는데 원인을 모르겠어요.','초보개발자',89),
        ('board','정보','GPT-4o 무료로 쓰는 방법 정리','최근 OpenAI에서 GPT-4o를 무료 플랜에서도 일부 사용 가능하게 했습니다. 사용량 제한이 있지만 알뜰하게 쓰는 팁을 공유합니다.','테크인싸',320),
        ('board','자유','요즘 뉴스 보기가 너무 힘드네요','경제도 어렵고 국제 정세도 복잡하고... 여러분들은 어떻게 정보 소화하시나요?','피곤한직장인',67),
        ('board','유머','개발자 밈 모음 2026 ver','최근에 본 개발자 관련 밈들 공유합니다. 웃겨서 저장해뒀어요 ㅋㅋ','밈수집가',512),
        ('board','질문','React에서 상태관리 뭐 쓰세요?','Redux vs Zustand vs Jotai 중에 고민 중입니다. 소규모 프로젝트에는 뭐가 적합할까요?','리액트입문자',178),
        ('board','정보','2026년 IT 취업 트렌드 분석','올해 상반기 IT 채용 시장을 분석해봤습니다. AI/ML 포지션이 작년 대비 2배 이상 증가했습니다.','취업멘토',445),
        ('board','자유','모닝독 어떻게 알게 되셨어요?','저는 지인 추천으로 알게 됐는데 여러분들은 어떻게 오게 되셨는지 궁금합니다 :)','궁금이',34)
      `)
    }
    // 샘플 미디어 데이터
    const mediaCount = await client.query('SELECT COUNT(*) FROM media')
    if (parseInt(mediaCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO media (type,title,description,url,author,category,duration) VALUES
        ('youtube','2024 글로벌 경제 전망 분석','세계 경제 전문가 심층 분석','dQw4w9WgXcQ','Bloomberg Korea','경제','18:32'),
        ('youtube','AI 기술 혁신의 현재와 미래','생성형 AI 산업 분석','jNQXAC9IVRw','TechInsight','기술','24:10'),
        ('podcast','아침 경제 브리핑 EP.142','오늘의 경제 뉴스 15분 요약','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3','모닝독','경제','15:04'),
        ('music','Focus Flow — Lo-fi Study Beats','집중력 향상 로파이 믹스','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3','ChillBeats','로파이','1:02:14')
      `)
    }

    console.log('✅ 데이터베이스 테이블 초기화 완료')
  } catch (err) {
    console.error('❌ DB 초기화 실패:', err)
    throw err
  } finally {
    client.release()
  }
}

export default pool