import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// HTTP 요청 메시지에 원본 바디를 포함하기 위한 인터페이스 확장
declare module "http" {
  interface IncomingMessage {
    rawBody: any;
  }
}

// JSON 파싱 미들웨어 설정 (데이터 무결성 검증 포함)
app.use(
  express.json({
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// 안티그래비티 표준 로그 출력 함수 (가독성 및 빌드 안정성 강화)
export function log(message: string, source: string = "express") {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// 요청 및 응답 상태를 감시하는 보안 모니터링 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedBody: any = undefined;

  const originalJson = res.json;
  res.json = function (body: any, ...args: any[]) {
    capturedBody = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedBody) {
        logLine += ` :: ${JSON.stringify(capturedBody)}`;
      }
      log(logLine);
    }
  });

  next();
});

// 서버 초기화 및 환경별 설정 로직
const initialize = async () => {
  // 비즈니스 라우트 등록
  await registerRoutes(httpServer, app);

  // 전역 예외 처리 핸들러 (서버 다운 방지)
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Critical Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }
    res.status(status).json({ message });
  });

  // 실행 환경(Production/Dev)에 따른 자원 서빙 설정
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
};

// 메인 엔진 기동
initialize();

// 중요: Vercel 서버리스 함수로 내보내기
export default app;

// 로컬 개발 환경용 서버 리스너
if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5000);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Local server running on port ${port}`);
  });
}