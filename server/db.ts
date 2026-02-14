import { drizzle } from "drizzle-orm/d1";
import * as schema from "@shared/schema";

/**
 * Cloudflare Workers D1 전용 DB 생성 함수
 * env.DB 는 wrangler.toml에 정의된 D1 binding
 */
export function createDb(env: any) {
  if (!env?.DB) {
    throw new Error("D1 database binding (env.DB) is not defined.");
  }

  return drizzle(env.DB, { schema });
}
