import { build as esbuild } from "esbuild"; // 초고속 빌드 도구 esbuild 로드
import { build as viteBuild } from "vite"; // 프론트엔드 빌드 도구 vite 로드
import { rm, readFile } from "fs/promises"; // 파일 시스템 제어 모듈 로드

const allowlist = [ // 번들에 포함할 핵심 라이브러리 목록 정의
"@google/generative-ai", // AI 모델 라이브러리
"axios", // HTTP 클라이언트
"connect-pg-simple", // 세션 저장소
"cors", // 교차 출처 리소스 공유
"date-fns", // 날짜 처리
"drizzle-orm", // 데이터베이스 ORM
"drizzle-zod", // 스키마 검증
"express", // 웹 프레임워크
"express-rate-limit", // 요청 속도 제한
"express-session", // 세션 관리
"jsonwebtoken", // 인증 토큰
"memorystore", // 메모리 저장소
"multer", // 파일 업로드
"nanoid", // 고유 ID 생성
"nodemailer", // 이메일 전송
"openai", // OpenAI API
"passport", // 인증 미들웨어
"passport-local", // 로컬 인증 전략
"pg", // PostgreSQL 드라이버
"stripe", // 결제 서비스
"uuid", // 고유 ID 생성
"ws", // 웹소켓
"xlsx", // 엑셀 처리
"zod", // 데이터 검증
"zod-validation-error", // 검증 에러 처리
]; // 목록 종료

async function buildAll() { // 전체 빌드 프로세스 시작
await rm("dist", { recursive: true, force: true }); // 이전 빌드 dist 폴더 삭제
await rm("api", { recursive: true, force: true }); // 이전 빌드 api 폴더 삭제

console.log("building client..."); // 클라이언트 빌드 시작 로그
await viteBuild(); // Vite를 이용한 프론트엔드 빌드 실행

console.log("building server..."); // 서버 빌드 시작 로그
const pkg = JSON.parse(await readFile("package.json", "utf-8")); // 패키지 설정 로드
const allDeps = [ // 모든 의존성 목록 결합
...Object.keys(pkg.dependencies || {}), // 일반 의존성
...Object.keys(pkg.devDependencies || {}), // 개발용 의존성
]; // 목록 결합 완료
const externals = allDeps.filter((dep) => !allowlist.includes(dep)); // 허용 목록 외 모듈은 외부 참조 처리

await esbuild({ // esbuild 서버 빌드 설정
entryPoints: ["server/index.ts"], // 서버 진입점 파일 지정
platform: "node", // 노드 환경 플랫폼 설정
bundle: true, // 모든 코드를 하나로 번들링
format: "esm", // 중요: ESM 형식을 사용하여 최신 노드 환경 호환
outfile: "api/index.js", // 중요: Vercel 실행 경로인 api 폴더에 저장
define: { // 환경 변수 정의
"process.env.NODE_ENV": '"production"', // 운영 환경으로 설정
}, // 정의 완료
minify: true, // 코드 압축 및 최적화 진행
external: externals, // 외부 모듈 제외 적용
logLevel: "info", // 빌드 로그 수준 설정
banner: { // ESM 환경 보완 코드 주입
js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);", // require 함수 지원용 배너
}, // 배너 주입 완료
}); // 빌드 완료
} // 빌드 함수 종료

buildAll().catch((err) => { // 예외 처리 및 실행
console.error(err); // 에러 로그 출력
process.exit(1); // 비정상 종료 코드 반환
}); // 실행 완료