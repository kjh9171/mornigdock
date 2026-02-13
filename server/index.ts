import express, { type Request, Response, NextFunction } from "express"; // 익스프레스 엔진 로드
import { registerRoutes } from "./routes"; // 라우트 등록 함수
import { serveStatic } from "./static"; // 정적 파일 서비스
import { createServer } from "http"; // HTTP 모듈 (로컬 개발용)
import path from "path"; // 경로 처리 모듈

const app = express(); // 앱 인스턴스 생성

// 인터페이스 확장: HTTP 메시지에 원본 바디 데이터 타입 정의
declare module "http" {
  interface IncomingMessage { rawBody: any; }
}

// 미들웨어 설정: 바디 파싱 및 보안 검증을 위한 원본 데이터 보존
app.use(express.json({
  verify: (req: any, _res: Response, buf: Buffer) => { req.rawBody = buf; }
}));

app.use(express.urlencoded({ extended: false })); // URL 인코딩 데이터 처리

// 보안 로그 시스템: CERT 총괄 로그 출력 함수
export function log(message: string, source: string = "express") {
  const now = new Date(); // 현재 시간 기록
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`); // 보안 로그 표준 출력
}

// 통신 모니터링 미들웨어: 모든 API 요청의 무결성 및 응답 시간 로깅
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now(); // 요청 시작 시각
  const path = req.path; // 요청 경로
  let capturedBody: any = undefined; // 응답 데이터 캡처용
  const originalJson = res.json; // 기존 json 메서드 백업
  
  res.json = function (body: any, ...args: any[]) { // json 메서드 오버라이딩
    capturedBody = body; // 응답 바디 기록
    return originalJson.apply(res, [body, ...args]); // 원본 기능 수행
  };
  
  res.on("finish", () => { // 응답 완료 시 로그 기록
    const duration = Date.now() - start; // 처리 소요 시간
    if (path.startsWith("/api")) { // API 경로인 경우에만 정밀 로깅
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedBody) logLine += ` :: ${JSON.stringify(capturedBody)}`;
      log(logLine); // 로그 시스템 전송
    }
  });
  next(); // 다음 미들웨어로 전달
});

// 서버 엔진 초기화 프로세스 (환경별 최적화)
const initialize = async () => {
  // 클라우드플레어 환경에서는 httpServer가 불필요하므로 로컬 환경에서만 생성
  const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const httpServer = !isProd ? createServer(app) : null;

  // API 라우트 엔진 등록 (httpServer가 null이어도 작동하도록 설계됨)
  await registerRoutes(httpServer as any, app);

  // 전역 보안 에러 핸들러
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  // 운영 환경(Cloudflare / Production) 설정
  if (isProd) {
    const publicPath = path.resolve(process.cwd(), "dist", "public"); // 빌드된 정적 파일 경로
    app.use(express.static(publicPath)); // 정적 에셋 서비스 활성화
    app.get("*", (req, res) => { // 클라이언트 사이드 라우팅 처리
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(publicPath, "index.html")); // 리액트 메인 전송
      }
    });
  } 
  // 로컬 개발 환경 설정
  else if (typeof process !== "undefined") {
    const { setupVite } = await import("./vite"); // 개발용 비테 엔진 로드
    if (httpServer) await setupVite(httpServer, app); // 비테 개발 서버 연동
    
    const port = Number(process.env?.PORT || 5000); // 포트 설정
    httpServer?.listen(port, "0.0.0.0", () => {
      log(`Local server running on port ${port}`); // 로컬 서버 기동 로그
    });
  }
};

// 엔진 초기화 실행 (에러 핸들링 포함)
initialize().catch(err => log(`Initialization Error: ${err.message}`, "error"));

/**
 * @CERT_SECURE_ADAPTER
 * 클라우드플레어 워커 배포 에러(10068) 해결을 위한 최종 병기
 * Express 앱을 Cloudflare Workers 표준 핸들러로 기가 막히게 내보냅니다.
 */
export default {
  async fetch(request: any, env: any, ctx: any) {
    // 워커 환경에서 전달된 env 객체를 전역 또는 필요한 곳에 바인딩 가능
    // 본 어댑터는 Express 앱을 워커의 요청 핸들러로 즉시 연결합니다.
    return (app as any).handle(request, env, ctx);
  }
};