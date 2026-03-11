import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

// ✅ 모듈 로드 시점이 아닌 실제 쿼리 시점에 연결 생성 (Lazy init)
function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  return neon(connectionString);
}

export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ rows: T[]; rowCount: number }> {
  const sql = getSql();
  try {
    const rows = await sql(text, params) as T[];
    return { rows, rowCount: rows.length };
  } catch (err: any) {
    console.error('[DB] Query 오류:', err.message, '\nSQL:', text);
    throw err;
  }
}

export async function transaction<T>(
  fn: (client: any) => Promise<T>
): Promise<T> {
  const sql = getSql();
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
  try {
    const sql = getSql();
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
    return query(text, params);
  },
  end: async () => {},
};