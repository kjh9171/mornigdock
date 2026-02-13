import { build as esbuild } from "esbuild"; // 빌드 도구 esbuild 로드
import { build as viteBuild } from "vite"; // 프론트엔드 빌드 도구 vite 로드
import { rm, readFile } from "fs/promises"; // 파일 시스템 제어 모듈 로드

// 서버 부팅 속도 향상을 위해 번들에 포함할 핵심 라이브러리 목록
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // 이전 빌드 결과물인 dist 폴더를 깨끗하게 삭제
  await rm("dist", { recursive: true, force: true });
  // Vercel 서버리스용 api 폴더를 초기화
  await rm("api", { recursive: true, force: true });

  console.log("building client...");
  // 리액트 클라이언트 사이드 코드 빌드 (dist/public 생성)
  await viteBuild();

  console.log("building server...");
  // 라이브러리 목록을 확인하기 위해 package.json 읽기
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  // 모든 종속성 목록 추출
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  // 허용 목록에 없는 라이브러리는 런타임에서 로드하도록 외부 처리
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    // 서버 시작 파일 경로
    entryPoints: ["server/index.ts"],
    // 노드 런타임 타겟 설정
    platform: "node",
    // 모든 코드를 하나로 묶음
    bundle: true,
    // 중요: CommonJS가 아닌 ESM 표준 형식으로 빌드
    format: "esm",
    // 중요: Vercel이 서버리스 함수로 인식하도록 api/index.js로 출력
    outfile: "api/index.js",
    // 환경 변수 주입
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // 코드 최적화 및 압축
    minify: true,
    // 외부 모듈 제외 설정 적용
    external: externals,
    // 빌드 로그 출력 수준 설정
    logLevel: "info",
    // ESM 환경에서 require 및 import.meta 호환성을 위한 패치 코드 삽입
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });
}

// 빌드 프로세스 실행 및 예외 처리
buildAll().catch((err) => {
  console.error(err); // 에러 발생 시 로그 출력
  process.exit(1); // 비정상 종료 처리
});