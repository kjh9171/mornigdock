import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mornigdock',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
})

export async function initDB() {
  try {
    console.log('📡 CERT: Validating Database Infrastructure...')
    
    // 1. 테이블 생성 (IF NOT EXISTS 사용으로 데이터 보존)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        two_factor_secret TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'board',
        category VARCHAR(100),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100) NOT NULL,
        source VARCHAR(255),
        source_url TEXT,
        pinned BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT false,
        reported BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        author VARCHAR(100),
        category VARCHAR(100),
        duration VARCHAR(50),
        is_active BOOLEAN DEFAULT true, -- 활성화 여부 컬럼 추가
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255),
        action TEXT NOT NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );
    `)

    // 2. [긴급 수술] 기존 media 테이블에 is_active 컬럼이 없는 경우 추가
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='is_active') THEN
          ALTER TABLE media ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // 3. 시스템 설정 기본값 (기존 값 유지)
    await pool.query("INSERT INTO system_config (key, value) VALUES ('ai_enabled', 'true') ON CONFLICT DO NOTHING")

    // 4. 관리자 권한 보장
    const hashedPw = await bcrypt.hash('admin123', 10)
    await pool.query(`
      INSERT INTO users (email, password, username, role) 
      VALUES ('gimjonghwan319@gmail.com', $1, 'Chief Admin', 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
    `, [hashedPw])

    // 5. 샘플 데이터 주입 (데이터가 없을 때만)
    const newsCheck = await pool.query("SELECT COUNT(*) FROM posts WHERE type = 'news'")
    if (parseInt(newsCheck.rows[0].count) === 0) {
      console.log('📝 CERT: Injecting initial news intelligence samples...')
      const sampleNews = [
        ['news', '경제', '2026 글로벌 거시경제 전망 보고서', '금리 인하 기조와 인플레이션 둔화가 맞물리며 신흥국 시장으로의 자금 유입이 가속화될 전망입니다...', 'Bloomberg', 'https://www.bloomberg.com'],
        ['news', '기술', '차세대 AI 반도체 혁신과 엔비디아의 전략', '엔비디아가 새로운 가속기 아키텍처를 발표하며 생성형 AI 하드웨어 시장의 지배력을 공고히 하고 있습니다...', 'TechCrunch', 'https://techcrunch.com'],
        ['news', '산업', '전고체 배터리 양산 프로젝트 돌입', '글로벌 완성차 업체들이 차세대 모빌리티의 핵심인 전고체 배터리 양산을 위한 대규모 투자를 시작했습니다...', 'Reuters', 'https://www.reuters.com'],
        ['news', '글로벌', '유럽 디지털 주권 확보를 위한 규제 강화', 'EU가 글로벌 빅테크 기업들을 대상으로 한 개인정보 보호 및 데이터 주권 법안을 공식 발효했습니다...', 'BBC News', 'https://www.bbc.com/news'],
        ['news', '정치', '동북아 반도체 공급망 재편과 국가 안보', '주요국들이 반도체를 안보 자산으로 규정하며 자국 중심의 공급망 구축에 사활을 걸고 있습니다...', 'Financial Times', 'https://www.ft.com']
      ]
      for (const n of sampleNews) {
        await pool.query("INSERT INTO posts (type, category, title, content, author_name, source, source_url) VALUES ($1, $2, $3, $4, 'System', $5, $6)", n)
      }
    }

    const mediaCheck = await pool.query("SELECT COUNT(*) FROM media")
    if (parseInt(mediaCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO media (type, title, url, author, duration, category) VALUES 
        ('youtube', '2026 경제 인사이트', 'dQw4w9WgXcQ', 'Finance Hub', '15:20', '경제'),
        ('podcast', '아고라 데일리 브리핑', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '아고라', '05:00', '기술'),
        ('music', '집중력 향상 Lofi', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'Lofi Curator', '60:00', '로파이')
      `)
    }

    console.log('✅ CERT: Database Infrastructure Synchronized.')
  } catch (err) {
    console.error('❌ CERT DB ERROR:', err)
  }
}

export default pool
