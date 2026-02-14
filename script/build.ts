import { build, type BuildOptions } from "esbuild"; // 빌드 엔진 로드
import path from "path"; // 경로 처리 모듈

// 서버 빌드 옵션 설정
const serverBuildOptions: BuildOptions = {
  entryPoints: ["server/index.ts"], // 진입점 설정
  bundle: true, // 의존성 포함 번들링
  outfile: "api/index.js", // 출력 파일 경로 (wrangler.toml의 main과 일치)
  platform: "node", // 플랫폼 설정
  format: "esm", // [CERT 중요] CJS에서 ESM으로 변경하여 클라우드플레어 규격 준수
  target: "node20", // 타겟 런타임 설정
  // [CERT 조치] 빌드 에러 해결을 위해 문제가 되는 바벨 내부 경로 및 불필요 모듈을 외부로 격리
  external: [
    "express", 
    "vite", 
    "@babel/preset-typescript/package.json", 
    "@babel/core"
  ], 
  banner: {
    // ESM 환경에서 __dirname 및 process.env 미비 문제 해결을 위한 폴리필 주입
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
};

const runBuild = async () => {
  try {
    console.log("building server for Cloudflare Workers (ESM)...");
    await build(serverBuildOptions); // 서버 빌드 실행
    console.log("⚡ Done: api/index.js (ESM format) created successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1); // 빌드 실패 시 프로세스 종료
  }
};

runBuild(); // 빌드 기동