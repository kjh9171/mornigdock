import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

const app = express();

/**
 * Workers 환경 감지
 */
const isWorker =
  typeof WebSocketPair !== "undefined" &&
  typeof navigator === "undefined";

/**
 * JSON Body Parser
 */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * 보안 로그 함수
 */
export function log(message: string, source: string = "express") {
  const now = new Date();
  const formattedTime = now.toISOString();
  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * 요청 로깅
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

/**
 * 초기화
 */
const initialize = async () => {
  await registerRoutes(null as any, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({
      message: err.message || "Internal Server Error",
    });
  });

  /**
   * 🔥 로컬 개발용 Node 서버
   * Workers 환경에서는 절대 실행되지 않음
   */
  if (!isWorker) {
    const { createServer } = await import("http");
    const httpServer = createServer(app);

    const port = Number(process.env.PORT || 5000);

    httpServer.listen(port, "0.0.0.0", () => {
      log(`Local server running on port ${port}`);
    });
  }
};

await initialize();

/**
 * 🔥 Cloudflare Workers 어댑터
 */
export default {
  async fetch(request: Request, env: any, ctx: any) {
    return (app as any).handle(request, env, ctx);
  },
};
