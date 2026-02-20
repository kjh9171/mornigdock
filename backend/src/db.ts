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
    
    // 1. 테이블 생성
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
        ai_analysis TEXT,
        related_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100) NOT NULL,
        source VARCHAR(255),
        source_url TEXT UNIQUE,
        related_video_url TEXT,
        related_audio_url TEXT,
        pinned BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
        is_active BOOLEAN DEFAULT true,
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
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        change_val DECIMAL(15, 2),
        change_rate DECIMAL(15, 2),
        market_status VARCHAR(50),
        ai_summary TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );
    `)

    // 2. 관리자 계정 보장 (대표님 이메일 정밀 조준)
    const hashedPw = await bcrypt.hash('admin123', 10)
    await pool.query(`
      INSERT INTO users (email, password, username, role) 
      VALUES ('gimjonghwan319@gmail.com', $1, 'Chief Admin', 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
    `, [hashedPw])

    // 3. [데이터 정화 작전] 기존 오염된 샘플/가짜 뉴스 전량 소각 (1회 실행 후 주석 처리 권장)
    /*
    await pool.query(`
      DELETE FROM posts 
      WHERE author_name IN ('네이버 뉴스 스크래퍼', '네이버 증권 수집기', '네이버 뉴스 수집기')
    `);
    */

    console.log('✅ CERT: Database Infrastructure Purified. Ready for Real-time Intelligence.')
  } catch (err) {
    console.error('❌ CERT DB ERROR:', err)
  }
}

export default pool
