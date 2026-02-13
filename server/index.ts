import express, { type Request, Response, NextFunction } from "express"; // 익스프레스 엔진 로드
import { registerRoutes } from "./routes"; // 라우트 등록 함수
import { serveStatic } from "./static"; // 정적 파일 서비스
import { createServer } from "http"; // HTTP 모듈
import path from "path"; // 경로 처리 모듈

const app = express(); // 앱 인스턴스 생성
const httpServer = createServer(app); // 서버 객체 생성

declare module "http" { // 인터페이스 확장
  interface IncomingMessage { rawBody: any; } // 원본 바디 데이터를 위한 필드 추가
}

app.use(express.json({ // 바디 파싱 및 원본 데이터 보존
  verify: (req: any, _res: Response, buf: Buffer) => { req.rawBody = buf; } // 웹훅 보안 검증 등을 위한 원본 보존
}));

app.use(express.urlencoded({ extended: false })); // URL 인코딩 데이터 처리

export function log(message: string, source: string = "express") { // 보안 로그 시스템
  const now = new Date(); // 현재 시간 객체 생성
  const formattedTime = now.toLocaleTimeString("en-US", { // 시간 포맷 설정
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`); // 콘솔에 보안 로그 출력
}

app.use((req: Request, res: Response, next: NextFunction) => { // 통신 모니터링 미들웨어
  const start = Date.now(); // 통신 시작 시간 기록
  const path = req.path; // 요청 경로 추출
  let capturedBody: any = undefined; // 응답 바디 캡처 변수
  const originalJson = res.json; // 기존 json 메서드 백업
  res.json = function (body: any, ...args: any[]) { // json 메서드 오버라이딩
    capturedBody = body; // 응답 바디 데이터 기록
    return originalJson.apply(res, [body, ...args]); // 기존 로직 수행
  };
  res.on("finish", () => { // 응답 종료 시 실행
    const duration = Date.now() - start; // 처리 소요 시간 계산
    if (path.startsWith("/api")) { // API 요청에 대해서만 로그 기록
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`; // 로그 라인 생성
      if (capturedBody) logLine += ` :: ${JSON.stringify(capturedBody)}`; // 바디 데이터 포함
      log(logLine); // 최종 로그 출력
    }
  });
  next(); // 다음 미들웨어로 진행
});

const initialize = async () => { // 서버 엔진 초기화 프로세스
  await registerRoutes(httpServer, app); // API 라우트 엔진 등록

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => { // 전역 보안 에러 핸들러
    const status = err.status || err.statusCode || 500; // 에러 상태 코드 결정
    res.status(status).json({ message: err.message || "Internal Server Error" }); // 에러 응답 전송
  });

  if (process.env.NODE_ENV === "production") { // 운영 배포 환경 설정
    const publicPath = path.resolve(process.cwd(), "dist", "public"); // 정적 파일 경로 확정
    app.use(express.static(publicPath)); // 정적 에셋 서비스 활성화
    app.get("*", (req, res) => { // 클라이언트 사이드 라우팅 통합
      if (!req.path.startsWith("/api")) { // API 요청이 아닌 경우에만 index.html 전송
        res.sendFile(path.join(publicPath, "index.html")); // 리액트 앱 진입점 전송
      }
    });
  } else { // 로컬 개발 환경 설정
    const { setupVite } = await import("./vite"); // 비테 엔진 동적 로드
    await setupVite(httpServer, app); // 개발 서버 셋업
  }
};

// 엔진 초기화 실행 (프로미스 체이닝 제거하여 핸들러 노출 최적화)
initialize().catch(err => log(`Initialization Error: ${err.message}`, "error"));

/**
 * @CERT_SECURE_ADAPTER
 * 클라우드플레어 워커 배포 에러(10068) 해결을 위한 핵심 핸들러 노출
 * Express 앱을 Cloudflare Workers 규격에 맞게 내보냅니다.
 */
export default {
  async fetch(request: any, env: any, ctx: any) { // 워커의 진입점 fetch 핸들러 정의
    // 이 구문이 있어야 클라우드플레어 API가 이벤트를 등록합니다.
    return (app as any).handle(request, env, ctx); // 익스프레스 앱 인스턴스에 요청 위임
  }
};

// 로컬 환경에서의 단독 실행을 위한 레거시 코드 유지 (NODE_ENV 기반)
if (process.env.NODE_ENV !== "production") { // 로컬 개발용 포트 활성화
  const port = Number(process.env.PORT || 5000); // 포트 번호 설정
  httpServer.listen(port, "0.0.0.0", () => { // 서버 리스닝 시작
    log(`Local server running on port ${port}`); // 기동 완료 로그 출력
  });
}