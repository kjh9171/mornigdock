import { registerRoutes } from "./routes";

/**
 * 보안 로그 함수
 */
export function log(message: string, source: string = "worker") {
  const now = new Date().toISOString();
  console.log(`${now} [${source}] ${message}`);
}

/**
 * Cloudflare Workers Entry
 */
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const start = Date.now();

      const response = await registerRoutes(request, env, ctx);

      const duration = Date.now() - start;

      const url = new URL(request.url);
      if (url.pathname.startsWith("/api")) {
        log(`${request.method} ${url.pathname} ${response.status} ${duration}ms`);
      }

      return response;
    } catch (err: any) {
      log(`Unhandled Error: ${err.message}`, "error");

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
