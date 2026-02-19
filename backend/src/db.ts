import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mornigdock',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
})

/**
 * 데이터베이스 초기화
 */
export async function initDB() {
  try {
    // 1. users 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
        two_factor_secret TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // 2. posts 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'board' CHECK (type IN ('board', 'news', 'qna')),
        category VARCHAR(100) DEFAULT '자유',
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100) NOT NULL,
        pinned BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        source VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // 3. comments 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        reported BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // 4. media 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL CHECK (type IN ('youtube', 'podcast', 'article')),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        url VARCHAR(1000) NOT NULL,
        thumbnail_url VARCHAR(1000),
        author VARCHAR(100),
        category VARCHAR(100),
        duration INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // 5. activity_logs 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // 인덱스 생성
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_type_category ON posts(type, category);
      CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
      CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    `)

    console.log('✅ 데이터베이스 테이블 초기화 완료')

    // 기본 관리자 계정 생성 (없으면)
    await createDefaultAdmin()
    
    // 샘플 데이터 생성 (개발 환경에만)
    if (process.env.NODE_ENV === 'development') {
      await createSampleData()
    }
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error)
    throw error
  }
}

/**
 * 기본 관리자 계정 생성
 */
async function createDefaultAdmin() {
  try {
    const result = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin'])
    
    if (result.rows.length === 0) {
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.default.hash('admin123', 10)
      
      await pool.query(
        `INSERT INTO users (email, password, username, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin@mornigdock.com', hashedPassword, '관리자', 'admin']
      )
      
      console.log('✅ 기본 관리자 계정 생성됨')
      console.log('   이메일: admin@mornigdock.com')
      console.log('   비밀번호: admin123')
      console.log('   ⚠️  프로덕션 환경에서는 반드시 비밀번호를 변경하세요!')
    }
  } catch (error) {
    console.error('관리자 계정 생성 실패:', error)
  }
}

/**
 * 샘플 데이터 생성 (개발용)
 */
async function createSampleData() {
  try {
    // 샘플 게시글 개수 확인
    const postsCount = await pool.query('SELECT COUNT(*) FROM posts')
    
    if (parseInt(postsCount.rows[0].count) === 0) {
      console.log('📝 샘플 데이터 생성 중...')
      
      // 관리자 ID 가져오기
      const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin'])
      const adminId = adminResult.rows[0]?.id || 1
      
      // 샘플 뉴스 게시글
      const newsData = [
        {
          title: '2026년 글로벌 AI 산업 전망',
          content: 'AI 기술이 빠르게 발전하면서 다양한 산업 분야에 적용되고 있습니다. 특히 생성형 AI의 발전으로 콘텐츠 제작, 마케팅, 교육 등의 분야에서 혁신이 일어나고 있습니다.',
          category: '기술',
          source: 'Tech News Today'
        },
        {
          title: '클린에너지 투자 급증, 탄소중립 목표 달성 기대',
          content: '전 세계적으로 클린에너지에 대한 투자가 급증하고 있으며, 2050 탄소중립 목표 달성을 위한 노력이 가속화되고 있습니다.',
          category: '환경',
          source: 'Green Economy'
        },
        {
          title: '원격근무 시대, 새로운 업무 문화 정착',
          content: '코로나19 이후 원격근무가 일상화되면서 기업들의 업무 문화가 변화하고 있습니다. 유연근무제와 하이브리드 근무 모델이 확산되고 있습니다.',
          category: '경제',
          source: 'Business Insider'
        },
        {
          title: '메타버스 플랫폼, 교육 분야 진출 본격화',
          content: '메타버스 기술이 교육 분야에 활발하게 적용되고 있습니다. 가상현실을 활용한 실습 교육과 글로벌 협업 수업이 증가하고 있습니다.',
          category: '기술',
          source: 'EdTech Weekly'
        },
        {
          title: '2026 글로벌 스타트업 투자 트렌드',
          content: 'AI, 헬스케어, 클린테크 분야의 스타트업에 대한 투자가 활발합니다. 벤처캐피탈들은 지속가능성과 사회적 영향력을 중요하게 평가하고 있습니다.',
          category: '경제',
          source: 'Startup Weekly'
        }
      ]
      
      for (const news of newsData) {
        await pool.query(
          `INSERT INTO posts (type, category, title, content, author_id, author_name, source, view_count, like_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          ['news', news.category, news.title, news.content, adminId, '관리자', news.source, 
           Math.floor(Math.random() * 100), Math.floor(Math.random() * 20)]
        )
      }
      
      // 샘플 게시판 글
      const boardData = [
        {
          title: '모닝독 커뮤니티에 오신 것을 환영합니다!',
          content: '안녕하세요! 모닝독 커뮤니티에 오신 것을 환영합니다. 자유롭게 의견을 나누고 정보를 공유해주세요.',
          category: '공지'
        },
        {
          title: '오늘의 날씨가 정말 좋네요',
          content: '아침에 일어나니 날씨가 너무 좋아서 기분이 좋습니다. 여러분은 어떤 하루를 보내고 계신가요?',
          category: '자유'
        },
        {
          title: '추천하는 책 있나요?',
          content: '요즘 읽을만한 좋은 책을 찾고 있습니다. 여러분이 최근에 읽은 책 중 추천하고 싶은 책이 있다면 공유해주세요!',
          category: '자유'
        }
      ]
      
      for (const board of boardData) {
        await pool.query(
          `INSERT INTO posts (type, category, title, content, author_id, author_name, pinned)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['board', board.category, board.title, board.content, adminId, '관리자', 
           board.category === '공지']
        )
      }
      
      // 샘플 미디어
      const mediaData = [
        {
          type: 'youtube',
          title: 'AI 시대의 미래 전망',
          description: '인공지능이 가져올 변화와 우리의 준비',
          url: 'https://www.youtube.com/watch?v=sample1',
          category: '기술',
          author: 'Tech Talk',
          duration: 1200
        },
        {
          type: 'podcast',
          title: '스타트업 성공 스토리',
          description: '실리콘밸리 창업자들의 인사이트',
          url: 'https://podcast.example.com/episode1',
          category: '비즈니스',
          author: 'Startup Cast',
          duration: 2400
        }
      ]
      
      for (const media of mediaData) {
        await pool.query(
          `INSERT INTO media (type, title, description, url, category, author, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [media.type, media.title, media.description, media.url, media.category, media.author, media.duration]
        )
      }
      
      console.log('✅ 샘플 데이터 생성 완료')
    }
  } catch (error) {
    console.error('샘플 데이터 생성 실패:', error)
  }
}

export default pool
