import { build as esbuild } from "esbuild"; // 빌드 엔진 로드
import { build as viteBuild } from "vite"; // 프론트엔드 빌드 도구 로드
import { rm, readFile } from "fs/promises"; // 파일 제어 모듈 로드

const allowlist = [ // 번들에 포함할 보안 허가 라이브러리 목록
"@google/generative-ai", "axios", "connect-pg-simple", "cors", "date-fns",
"drizzle-orm", "drizzle-zod", "express", "express-rate-limit", "express-session",
"jsonwebtoken", "memorystore", "multer", "nanoid", "nodemailer", "openai",
"passport", "passport-local", "pg", "stripe", "uuid", "ws", "xlsx", "zod", "zod-validation-error"
];

async function buildAll() { // 통합 빌드 프로세스 시작
await rm("dist", { recursive: true, force: true }); // 이전 결과물 삭제
await rm("api", { recursive: true, force: true }); // 이전 서버 결과물 삭제

console.log("building client..."); // 클라이언트 빌드 수행
await viteBuild();

console.log("building server..."); // 서버 빌드 수행
const pkg = JSON.parse(await readFile("package.json", "utf-8"));
const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
const externals = allDeps.filter((dep) => !allowlist.includes(dep));

await esbuild({ // esbuild 설정 가동
entryPoints: ["server/index.ts"],
platform: "node",
bundle: true,
format: "esm",
outfile: "api/index.js",
define: { "process.env.NODE_ENV": '"production"' },
minify: true,
external: externals,
logLevel: "info",
banner: { // ESM 환경 보완 패치
js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
}
});
}

buildAll().catch((err) => { // 예외 처리 및 실행
console.error(err);
process.exit(1);
});