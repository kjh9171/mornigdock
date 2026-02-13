import express, { type Request, Response, NextFunction } from "express"; // 익스프레스 엔진 로드
import { registerRoutes } from "./routes"; // 라우트 등록 함수
import { serveStatic } from "./static"; // 정적 파일 서비스
import { createServer } from "http"; // HTTP 모듈
import path from "path"; // 경로 처리 모듈

const app = express(); // 앱 인스턴스 생성
const httpServer = createServer(app); // 서버 객체 생성

declare module "http" { // 인터페이스 확장
interface IncomingMessage { rawBody: any; }
}

app.use(express.json({ // 바디 파싱 및 원본 데이터 보존
verify: (req: any, _res: Response, buf: Buffer) => { req.rawBody = buf; }
}));

app.use(express.urlencoded({ extended: false })); // URL 인코딩 처리

export function log(message: string, source: string = "express") { // 보안 로그 시스템
const now = new Date();
const formattedTime = now.toLocaleTimeString("en-US", {
hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
});
// 수정 완료: 백틱 기호를 명확히 삽입하여 구문 에러를 해결했습니다.
console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req: Request, res: Response, next: NextFunction) => { // 통신 모니터링
const start = Date.now();
const path = req.path;
let capturedBody: any = undefined;
const originalJson = res.json;
res.json = function (body: any, ...args: any[]) {
capturedBody = body;
return originalJson.apply(res, [body, ...args]);
};
res.on("finish", () => { // 응답 종료 로그 기록
const duration = Date.now() - start;
if (path.startsWith("/api")) {
let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
if (capturedBody) logLine += ` :: ${JSON.stringify(capturedBody)}`;
log(logLine);
}
});
next();
});

const initialize = async () => { // 서버 엔진 초기화 프로세스
await registerRoutes(httpServer, app); // API 라우트 등록

app.use((err: any, _req: Request, res: Response, next: NextFunction) => { // 전역 에러 핸들러
const status = err.status || err.statusCode || 500;
res.status(status).json({ message: err.message || "Internal Server Error" });
});

if (process.env.NODE_ENV === "production") { // 운영 환경 경로 보정
const publicPath = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(publicPath));
app.get("*", (req, res) => { // 클라이언트 사이드 라우팅 처리
if (!req.path.startsWith("/api")) {
res.sendFile(path.join(publicPath, "index.html"));
}
});
} else { // 개발 환경 설정
const { setupVite } = await import("./vite");
await setupVite(httpServer, app);
}
};

initialize(); // 엔진 기동

export default app; // Vercel 서버리스 익스포트

if (process.env.NODE_ENV !== "production") { // 로컬 개발용 포트 개방
const port = Number(process.env.PORT || 5000);
httpServer.listen(port, "0.0.0.0", () => {
log(`Local server running on port ${port}`);
});
}