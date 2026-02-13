import { build as esbuild } from "esbuild"; // esbuild 엔진 로드
import { build as viteBuild } from "vite"; // vite 엔진 로드
import { rm, readFile } from "fs/promises"; // 파일 제어 모듈 로드

const allowlist = [ // 번들에 포함할 보안 승인 라이브러리 목록
"@google/generative-ai", "axios", "connect-pg-simple", "cors", "date-fns",
"drizzle-orm", "drizzle-zod", "express", "express-rate-limit", "express-session",
"jsonwebtoken", "memorystore", "multer", "nanoid", "nodemailer", "openai",
"passport", "passport-local", "pg", "stripe", "uuid", "ws", "xlsx", "zod", "zod-validation-error"
];

async function buildAll() { // 통합 빌드 프로세스
await rm("dist", { recursive: true, force: true }); // 이전 dist 삭제
await rm("api", { recursive: true, force: true }); // 이전 api 폴더 삭제

console.log("building client..."); // 클라이언트 빌드 시작
await viteBuild(); // 리액트 빌드 (결과물: dist/public)

console.log("building server..."); // 서버 빌드 시작
const pkg = JSON.parse(await readFile("package.json", "utf-8")); // 설정 로드
const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
const externals = allDeps.filter((dep) => !allowlist.includes(dep)); // 외부분리 모듈 선별

await esbuild({ // 서버 코드 번들링
entryPoints: ["server/index.ts"], // 진입점
platform: "node", // 노드 환경
bundle: true, // 번들링 활성화
format: "esm", // ESM 포맷 적용
outfile: "api/index.js", // Vercel 함수 경로로 출력
define: { "process.env.NODE_ENV": '"production"' }, // 운영 모드 주입
minify: true, // 코드 압축
external: externals, // 외부 모듈 적용
logLevel: "info", // 로그 레벨
banner: { // ESM 호환용 배너 주입
js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
}
});
}

buildAll().catch((err) => { // 실행 및 예외 처리
console.error(err);
process.exit(1);
});