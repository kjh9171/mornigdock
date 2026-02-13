import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: any;
  }
}

app.use(
  express.json({
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source: string = "express") {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      if (capturedBody) logLine += ` :: ${JSON.stringify(capturedBody)}`;
      log(logLine);
    }
  });
  next();
});

const initialize = async () => {
  // 라우트 등록
  await registerRoutes(httpServer, app);

  // 에러 핸들러
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  // 정적 파일 서빙 (Vercel 환경 최적화)
  if (process.env.NODE_ENV === "production") {
    // Vercel 람다 환경에서는 절대 경로로 접근해야 안전합니다.
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    app.use(express.static(publicPath));
    
    // SPA를 위한 캐치올 라우팅
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
};

initialize();

export default app;

if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5000);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Local server running on port ${port}`);
  });
}