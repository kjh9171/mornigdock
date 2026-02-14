import { build, type BuildOptions } from "esbuild";

/**
 * Cloudflare Workers (ESM) 전용 서버 빌드 옵션
 * - Node 전용 해석 모드 제거
 * - Workers 런타임에 맞춘 neutral 플랫폼 사용
 * - Native 바이너리 의존성 완전 배제
 */
const serverBuildOptions: BuildOptions = {
  entryPoints: ["server/index.ts"],

  bundle: true,
  outfile: "api/index.js",

  // 🔥 핵심 수정: node → neutral
  platform: "neutral",

  format: "esm",
  target: "es2022",

  // Workers에서 필요 없는 / 문제 유발 모듈 제거
  external: [
    "vite",
    "@babel/*",
    "fsevents",
    "lightningcss",
    "@tailwindcss/vite",
    "bufferutil",
    "utf-8-validate",
    "pg-native"
  ],

  define: {
    "process.env.NODE_ENV": '"production"',
  },

  logOverride: {
    "unsupported-regexp": "silent",
  },
};

const runBuild = async () => {
  try {
    console.log("building server for Cloudflare Workers (ESM)...");
    await build(serverBuildOptions);
    console.log("⚡ Done: api/index.js (ESM format) created successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

runBuild();
