/**
 * 시스템 설정값을 DB에서 조회하거나 환경변수에서 가져옵니다.
 * (DB 설정을 우선하며, 없을 경우 환경변수를 반환합니다.)
 */
export declare function getSystemSetting(key: string, defaultValue?: string): Promise<string>;
/**
 * 여러 설정값을 한 번에 가져옵니다.
 */
export declare function getSystemSettings(keys: string[]): Promise<Record<string, string>>;
//# sourceMappingURL=settings.d.ts.map