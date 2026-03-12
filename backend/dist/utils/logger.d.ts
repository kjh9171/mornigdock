/**
 * 📡 CERT 활동 로그 기록 헬퍼
 * access_logs 테이블에 사용자 활동을 기록합니다.
 * @param userId  사용자 ID (비로그인 시 null)
 * @param email   사용자 이메일 (선택)
 * @param action  활동 내용 설명
 * @param ip      클라이언트 IP 주소
 * @param endpoint 요청한 엔드포인트 (선택)
 */
export declare function logActivity(userId: number | null, email: string | null, action: string, ip?: string, endpoint?: string): Promise<void>;
//# sourceMappingURL=logger.d.ts.map