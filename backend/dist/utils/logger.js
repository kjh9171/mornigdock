import { pool } from '../db/pool.js'; // pool을 올바른 경로에서 임포트
/**
 * 📡 CERT 활동 로그 기록 헬퍼
 * access_logs 테이블에 사용자 활동을 기록합니다.
 * @param userId  사용자 ID (비로그인 시 null)
 * @param email   사용자 이메일 (선택)
 * @param action  활동 내용 설명
 * @param ip      클라이언트 IP 주소
 * @param endpoint 요청한 엔드포인트 (선택)
 */
export async function logActivity(userId, email, action, ip = '127.0.0.1', endpoint = '') {
    try {
        await pool.query(`INSERT INTO access_logs (user_id, email, action, ip_address, endpoint)
       VALUES ($1, $2, $3, $4, $5)`, [userId, email, action, ip, endpoint]);
    }
    catch (err) {
        // 로그 기록 실패는 조용히 처리 (서비스 중단 방지)
        console.error('❌ 로그 기록 실패:', err);
    }
}
//# sourceMappingURL=logger.js.map