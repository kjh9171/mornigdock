import { neon, neonConfig } from '@neondatabase/serverless';

// Cloudflare Workers 환경에서 WebSocket 사용
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL || '';

// Neon 서버리스 SQL 클라이언트
const sql = neon(connectionString);

// 기존 코드와 호환되는 query 함수
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ rows: T[]; rowCount: number }> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  try {
    const rows = await sql(text, params) as T[];
    return { rows, rowCount: rows.length };
  } catch (err: any) {
    console.error('[DB] Query 오류:', err.message, '\nSQL:', text);
    throw err;
  }
}

// transaction 함수 (간소화 — Neon 서버리스는 연결 풀 불필요)
export async function transaction<T>(
  fn: (client: any) => Promise<T>
): Promise<T> {
  const client = {
    query: async (text: string, params?: any[]) => {
      const rows = await sql(text, params);
      return { rows, rowCount: rows.length };
    },
    release: () => {},
  };
  try {
    await sql('BEGIN');
    const result = await fn(client);
    await sql('COMMIT');
    return result;
  } catch (err) {
    await sql('ROLLBACK');
    throw err;
  }
}

export async function checkDbConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await sql('SELECT 1');
    return true;
  } catch (err: any) {
    console.error('[DB] Health check 실패:', err.message);
    return false;
  }
}

// pool export (하위 호환성)
export const pool = {
  query: async (text: string, params?: any[]) => {
    const rows = await sql(text, params);
    return { rows, rowCount: rows.length };
  },
  end: async () => {},
};