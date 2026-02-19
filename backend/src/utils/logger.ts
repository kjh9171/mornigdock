import pool from '../db'

/**
 * 📡 CERT 활동 로그 기록 헬퍼
 * @param userId 사용자 ID (선택)
 * @param email 사용자 이메일 (선택)
 * @param action 활동 내용
 * @param ip IP 주소
 */
export async function logActivity(userId: number | null, email: string | null, action: string, ip: string = '127.0.0.1') {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, email, action, ip_address) VALUES ($1, $2, $3, $4)`,
      [userId, email, action, ip]
    )
  } catch (err) {
    console.error('❌ 로그 기록 실패:', err)
  }
}
