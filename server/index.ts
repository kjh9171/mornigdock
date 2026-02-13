import express, { type Request, Response, NextFunction } from "express"; // 익스프레스 모듈 로드
import { registerRoutes } from "./routes"; // 라우트 등록 함수 로드
import { serveStatic } from "./static"; // 정적 파일 서비스 로드
import { createServer } from "http"; // HTTP 서버 생성 도구 로드

const app = express(); // 익스프레스 애플리케이션 인스턴스 생성
const httpServer = createServer(app); // HTTP 서버 객체 생성

declare module "http" { // HTTP 모듈 인터페이스 확장
interface IncomingMessage { // 메시지 타입 확장
rawBody: unknown; // 원본 데이터 바디 필드 추가
} // 확장 완료
} // 모듈 확장 완료

app.use( // JSON 파싱 미들웨어 사용 설정
express.json({ // JSON 옵션 정의
verify: (req, _res, buf) => { // 데이터 무결성 검증 함수
req.rawBody = buf; // 요청 객체에 원본 바디 저장
}, // 검증 종료
}), // 파싱 설정 완료
); // 미들웨어 적용 완료

app.use(express.urlencoded({ extended: false })); // URL 인코딩 데이터 처리 미들웨어 적용

export function log(message: string, source = "express") { // 보안 로그 출력 함수 정의
const formattedTime = new Date().toLocaleTimeString("en-US", { // 시간 포맷 설정
hour: "numeric", // 시간 표시
minute: "2-digit", // 분 표시
second: "2-digit", // 초 표시
hour12: true, // 12시간 형식 사용
}); // 포맷 설정 완료

console.log(${formattedTime} [${source}] ${message}); // 표준 출력으로 로그 전송
} // 로그 함수 종료

app.use((req, res, next) => { // 요청 모니터링 미들웨어 시작
const start = Date.now(); // 요청 시작 시간 기록
const path = req.path; // 요청 경로 추출
let capturedJsonResponse: Record<string, any> | undefined = undefined; // 응답 데이터 저장용 변수

const originalResJson = res.json; // 기존 JSON 응답 함수 보관
res.json = function (bodyJson, ...args) { // JSON 응답 함수 가로채기
capturedJsonResponse = bodyJson; // 응답 내용 복사 저장
return originalResJson.apply(res, [bodyJson, ...args]); // 원본 함수 실행
}; // 함수 래핑 완료

res.on("finish", () => { // 응답 종료 이벤트 리스너
const duration = Date.now() - start; // 처리 소요 시간 계산
if (path.startsWith("/api")) { // API 요청인 경우에만 로그 기록
let logLine = ${req.method} ${path} ${res.statusCode} in ${duration}ms; // 로그 메시지 생성
if (capturedJsonResponse) { // 응답 데이터가 있는 경우
logLine +=  :: ${JSON.stringify(capturedJsonResponse)}; // 로그에 응답 데이터 포함
} // 조건 종료
log(logLine); // 최종 로그 출력
} // 조건 종료
}); // 리스너 설정 완료

next(); // 다음 미들웨어로 제어권 이동
}); // 모니터링 미들웨어 종료

const initializeServer = async () => { // 서버 기능 초기화 비동기 함수 시작
await registerRoutes(httpServer, app); // 비즈니스 라우트 및 API 등록 실행

app.use((err: any, _req: Request, res: Response, next: NextFunction) => { // 전역 에러 처리 미들웨어
const status = err.status || err.statusCode || 500; // 에러 상태 코드 결정
const message = err.message || "Internal Server Error"; // 에러 메시지 결정

console.error("Internal Server Error:", err); // 보안 분석용 서버 에러 로그

if (res.headersSent) { // 이미 헤더가 전송된 경우 처리
  return next(err); // 다음 핸들러로 위임
} // 조건 종료

return res.status(status).json({ message }); // 클라이언트에 에러 정보 반환
}); // 에러 미들웨어 종료

if (process.env.NODE_ENV === "production") { // 운영 환경인 경우
serveStatic(app); // 빌드된 정적 파일 서빙 실행
} else { // 개발 환경인 경우
const { setupVite } = await import("./vite"); // Vite 개발 도구 로드
await setupVite(httpServer, app); // 개발 서버 설정 실행
} // 조건 종료
}; // 초기화 함수 종료

initializeServer(); // 서버 엔진 초기화 프로세스 즉시 가동

export default app; // 중요: Vercel 서버리스 런타임이 앱을 인식하도록 내보내기

if (process.env.NODE_ENV !== "production") { // 개발 환경에서만 수동 서버 가동
const port = parseInt(process.env.PORT || "5000", 10); // 실행 포트 결정
httpServer.listen( // HTTP 리스너 개방
{ // 옵션 설정
port, // 설정된 포트 사용
host: "0.0.0.0", // 모든 인터페이스에서 수신
}, // 옵션 종료
() => { // 가동 성공 시 콜백
log(serving on port ${port}); // 서버 가동 성공 로그 출력
}, // 콜백 종료
); // 리스너 설정 완료
} // 조건 종료