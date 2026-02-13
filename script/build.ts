import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// 서버 cold start 시간을 단축하기 위해 번들링할 종속성 목록입니다.
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
  // 빌드 시작 전 기존 dist 폴더를 깔끔하게 삭제합니다.
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  // 리액트 클라이언트 사이드 코드를 먼저 빌드합니다.
  await viteBuild();

  console.log("building server...");
  // 설정 정보를 가져오기 위해 package.json을 읽습니다.
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  // 허용 목록에 없는 라이브러리는 외부 참조로 처리합니다.
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    // 서버 진입점 파일을 지정합니다.
    entryPoints: ["server/index.ts"],
    // 노드 환경에 맞게 빌드 플랫폼을 설정합니다.
    platform: "node",
    // 의존성들을 하나로 묶어 번들링합니다.
    bundle: true,
    // 중요: 기존 cjs에서 esm으로 형식을 변경하여 호환성 문제를 해결합니다.
    format: "esm",
    // 중요: 확장자를 .js로 변경하여 Vercel이 실행 파일로 인식하게 합니다.
    outfile: "dist/index.js",
    define: {
      // 빌드 환경을 프로덕션으로 정의합니다.
      "process.env.NODE_ENV": '"production"',
    },
    // 코드 크기를 줄이기 위해 압축을 진행합니다.
    minify: true,
    // 번들에서 제외할 외부 모듈을 적용합니다.
    external: externals,
    logLevel: "info",
    // ESM 환경에서도 기존 node 기능을 사용할 수 있도록 배너 코드를 삽입합니다.
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });
}

// 빌드 함수를 실행하고 발생한 에러를 추적합니다.
buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});