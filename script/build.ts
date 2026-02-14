import { build, type BuildOptions } from "esbuild"; // 빌드 엔진 로드
import path from "path"; // 경로 처리 모듈

// 서버 빌드 옵션 설정
const serverBuildOptions: BuildOptions = {
  entryPoints: ["server/index.ts"], // 진입점 설정
  bundle: true, // [CERT 중요] 모든 의존성을 하나로 번들링하여 Cloudflare Workers 환경에 최적화
  outfile: "api/index.js", // 출력 파일 경로 (wrangler.toml의 main과 일치)
  platform: "node", // 플랫폼 설정
  format: "esm", // ESM 형식으로 출력하여 Cloudflare Workers 규격 준수
  target: "node20", // 타겟 런타임 설정
  // [CERT 조치] 빌드 에러 해결을 위해 실제 실행에 불필요한 도구들만 제외합니다.
  // express는 반드시 번들링되어야 하므로 external에서 제거했습니다.
  external: [
    "vite", 
    "@babel/*", 
    "fsevents"
  ], 
  // [CERT 조치] 빌드 시 발생하는 해석 불가능한 경고 및 에러 무시 설정
  logOverride: {
    "unsupported-regexp": "silent",
  },
  banner: {
    // ESM 환경에서 require 및 Node.js 표준 모듈 폴리필 지원을 위한 구문 주입
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
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