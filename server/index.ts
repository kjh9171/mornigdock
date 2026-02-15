import { registerRoutes } from "./routes";

export function log(message: string, source: string = "worker") {
  const now = new Date().toISOString();
  console.log(`${now} [${source}] ${message}`);
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);

      // API 요청만 워커 라우터에서 처리하고,
      // 그 외 경로는 정적 에셋(SPA)으로 전달
      if (!url.pathname.startsWith("/api")) {
        return await serveAsset(request, env);
      }

      const start = Date.now();
      const response = await registerRoutes(request, env, ctx);
      const duration = Date.now() - start;
      if (url.pathname.startsWith("/api")) {
        log(`${request.method} ${url.pathname} ${response.status} ${duration}ms`);
      }

      return response;
    } catch (err: any) {
      log(`Unhandled Error: ${err?.message}`, "error");

      return new Response(
        JSON.stringify({ message: "Internal Server Error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

async function serveAsset(request: Request, env: any): Promise<Response> {
  if (!env?.ASSETS?.fetch) {
    return new Response("Static assets binding is not configured", { status: 500 });
  }

  let assetResponse = await env.ASSETS.fetch(request);

  // SPA 라우팅: 파일이 없으면 index.html 반환
  if (assetResponse.status === 404) {
    const url = new URL(request.url);
    assetResponse = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
  }

  // JavaScript 파일에 대한 Content-Type을 명시적으로 설정
  // 이는 브라우저가 ES 모듈을 올바르게 해석하도록 돕습니다.
  const url = new URL(request.url);
  const fileExtension = url.pathname.split('.').pop();
  if (fileExtension === 'js' || fileExtension === 'mjs' || fileExtension === 'jsx' || fileExtension === 'tsx') {
    const headers = new Headers(assetResponse.headers);
    headers.set('Content-Type', 'application/javascript');
    return new Response(assetResponse.body, { ...assetResponse, headers });
  }

  return assetResponse;
}
