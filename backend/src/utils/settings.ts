import { query } from '../db/pool.js';

/**
 * 시스템 설정값을 DB에서 조회하거나 환경변수에서 가져옵니다.
 * (DB 설정을 우선하며, 없을 경우 환경변수를 반환합니다.)
 */
export async function getSystemSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const res = await query('SELECT value FROM system_settings WHERE key = $1', [key.toLowerCase()]);
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
  } catch (err) {
    console.error(`[Settings] Failed to fetch key: ${key}`, err);
  }

  // DB에 없을 경우 환경변수에서 조회 (대문자로 변환하여 매칭)
  return process.env[key.toUpperCase()] || defaultValue;
}

/**
 * 여러 설정값을 한 번에 가져옵니다.
 */
export async function getSystemSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(keys.map(async (key) => {
    result[key] = await getSystemSetting(key);
  }));
  return result;
}
