import { build, type BuildOptions } from "esbuild"; // 빌드 엔진 로드
import path from "path"; // 경로 처리 모듈

/**
 * @CERT_SECURE_BUILD_SYSTEM
 * Cloudflare Workers (ESM) 배포 무결성을 위한 서버 빌드 옵션
 */
const serverBuildOptions: BuildOptions = {
  entryPoints: ["server/index.ts"], // 진입점 설정
  bundle: true, // [CERT 핵심] 모든 의존성을 하나로 번들링하여 Cloudflare Workers 환경에 완벽 최적화
  outfile: "api/index.js", // 출력 파일 경로 (wrangler.toml의 main 항목과 반드시 일치해야 함)
  platform: "node", // 플랫폼 설정 (nodejs_compat 플래그와 연동됨)
  format: "esm", // ESM 규격 필수 (Cloudflare Workers 모듈 방식 준수)
  target: "node20", // 타겟 런타임 설정
  // [CERT 조치] 빌드 에러를 유발하거나 엣지 환경에 불필요한 도구만 제외
  external: [
    "vite", 
    "@babel/*", 
    "fsevents",
    "lightningcss" // 불필요한 바이너리 모듈 제외
  ], 
  // [CERT 조치] 환경 변수 강제 주입 (process.env 참조 에러 방지)
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // [CERT 조치] 빌드 시 발생하는 해석 불가능한 경고 및 에러 무시 설정
  logOverride: {
    "unsupported-regexp": "silent",
  },
  banner: {
    // [CERT 필살기] ESM 환경에서 Node.js 표준 모듈 및 require 지원을 위한 폴리필 주입
    js: `
import { createRequire } from 'node:module';
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
    process.exit(1); // 빌드 실패 시 프로세스 즉각 종료
  }
};

runBuild(); // 빌드 프로세스 가동