import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// 서버 앱 및 HTTP 서버 인스턴스 초기화
const app = express();
const httpServer = createServer(app);

// HTTP 요청 메시지에 원본 바디를 포함하기 위한 인터페이스 확장
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// JSON 파싱 미들웨어 및 원본 데이터(rawBody) 검증 설정
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// URL 인코딩 데이터 처리를 위한 미들웨어
app.use(express.urlencoded({ extended: false }));

// 안티그래비티 표준 로그 출력 함수
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// 모든 요청에 대한 응답 시간 및 상태 코드 추적 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// 서버 초기화 및 라우터 등록을 처리하는 비동기 함수
const initializeServer = async () => {
  // 비즈니스 로직 및 API 라우트 등록
  await registerRoutes(httpServer, app);

  // 글로벌 에러 핸들링 미들웨어
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // 환경에 따른 정적 파일 서비스 설정
  if (process.env.NODE_ENV === "production") {
    // 운영 환경: 빌드된 클라이언트 파일 서빙
    serveStatic(app);
  } else {
    // 개발 환경: Vite 개발 서버 연동
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
};

// 초기화 함수 즉시 실행
initializeServer();

// 중요: Vercel 서버리스 환경을 위해 앱 인스턴스를 내보냅니다.
export default app;

// 로컬 개발 환경에서만 포트를 개방하여 서버를 직접 구동합니다.
if (process.env.NODE_ENV !== "production") {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
}