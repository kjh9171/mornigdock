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
  external: ["express", "vite"], // 외부 모듈 제외 설정 (필요 시)
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
    process.exit(1);
  }
};

runBuild(); // 빌드 기동