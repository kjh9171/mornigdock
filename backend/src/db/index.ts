import { Pool } from 'pg'

// ✅ PostgreSQL 연결 풀 설정
// Docker Compose 환경에서 서비스 이름(db)으로 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mornigdock',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,           // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// ✅ 연결 테스트
pool.on('connect', () => {
  console.log('✅ PostgreSQL 연결 성공')
})

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 연결 오류:', err)
})

// ✅ 테이블 초기화 함수 (서버 시작 시 자동 실행)
export async function initDB() {
  const client = await pool.connect()
  try {
    // users 테이블 생성
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

    // 세션/활동 로그 테이블 생성
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

    console.log('✅ 데이터베이스 테이블 초기화 완료')
  } catch (err) {
    console.error('❌ 데이터베이스 초기화 실패:', err)
    throw err
  } finally {
    client.release()
  }
}

export default pool