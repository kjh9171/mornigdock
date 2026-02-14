import { build, type BuildOptions } from "esbuild";

/**
 * Cloudflare Workers 배포용 서버 번들
 * - dev 전용 vite 코드 제거
 * - lightningcss 완전 차단
 * - production define으로 tree shaking 유도
 */
const serverBuildOptions: BuildOptions = {
  entryPoints: ["server/index.ts"],
  bundle: true,
  outfile: "api/index.js",
  platform: "node",
  format: "esm",
  target: "node20",

  external: [
    "vite",
    "@tailwindcss/vite",
    "lightningcss",
    "@babel/*",
    "fsevents"
  ],

  define: {
    "process.env.NODE_ENV": '"production"',
  },

  treeShaking: true,
};

const runBuild = async () => {
  try {
    console.log("building server for Cloudflare Workers (ESM)...");
    await build(serverBuildOptions);
    console.log("⚡ Done: api/index.js created successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

runBuild();
