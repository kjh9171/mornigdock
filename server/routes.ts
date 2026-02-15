import { DatabaseStorage } from "./storage";
import { z } from "zod";
import { User } from "@shared/schema"; // User 타입 임포트
import {
  handleRegister,
  handleLogin,
  handleMfaSetup,
  handleMfaVerify,
  verifyJwtToken,
} from "./authWorker"; // authWorker에서 인증 핸들러 및 JWT 검증 함수 임포트

// =========================
// Helpers (응답 및 에러 처리)
// =========================

/**
 * JSON 응답을 생성합니다.
 * @param data 응답으로 보낼 데이터
 * @param status HTTP 상태 코드 (기본값: 200)
 * @returns Response 객체
 */
function json(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * HTTP 에러를 나타내는 커스텀 클래스입니다.
 * 이 클래스를 사용하여 API 핸들러에서 에러를 throw하고 중앙에서 catch하여 처리할 수 있습니다.
 */
export class ResponseError extends Error {
  constructor(public message: string, public status: number = 500) {
    super(message);
    this.name = "ResponseError";
  }
}

/**
 * 요청 본문을 안전하게 JSON으로 파싱합니다.
 * @param request Request 객체
 * @returns 파싱된 JSON 객체 또는 빈 객체
 */
async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * OpenAI 호출
 */
async function callOpenAI(prompt: string, env: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new ResponseError("OpenAI request failed", response.status); // ResponseError 사용
  }

  const data: any = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

// Context 객체에 사용자 정보를 추가하기 위한 타입 확장
declare module '@cloudflare/workers-types' {
  interface Request {
    user?: User; // JWT 미들웨어에서 추가될 사용자 정보
  }
}

/**
 * JWT 토큰을 검증하고 요청 객체에 사용자 정보를 추가하는 미들웨어 함수입니다.
 * @param request Request 객체
 * @param env 환경 변수
 * @throws ResponseError 인증 실패 시
 */
async function authenticateJwt(request: Request, env: any) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1]; // "Bearer TOKEN" 형식에서 TOKEN 추출

  if (!token) {
    throw new ResponseError("인증 토큰이 필요합니다.", 401);
  }

  const user = verifyJwtToken(token, env.JWT_SECRET);
  if (!user) {
    throw new ResponseError("유효하지 않은 인증 토큰입니다.", 401);
  }
  
  // request 객체에 사용자 정보 추가
  // @ts-ignore
  request.user = user;
}

/**
 * 사용자 인증을 요구하는 미들웨어입니다.
 * @param request Request 객체
 * @throws ResponseError 인증되지 않은 사용자일 경우
 */
function requireAuth(request: Request) {
  // @ts-ignore
  if (!request.user) {
    throw new ResponseError("로그인이 필요합니다.", 401);
  }
}

/**
 * 특정 역할을 요구하는 미들웨어입니다.
 * @param request Request 객체
 * @param allowedRoles 허용된 역할 배열
 * @throws ResponseError 권한이 없거나 인증되지 않은 사용자일 경우
 */
function requireRole(request: Request, allowedRoles: string[]) {
  // @ts-ignore
  if (!request.user) {
    throw new ResponseError("로그인이 필요합니다.", 401);
  }
  // @ts-ignore
  if (!allowedRoles.includes(request.user.role)) {
    throw new ResponseError("이 작업을 수행할 권한이 없습니다.", 403);
  }
}


export async function registerRoutes(
  request: Request,
  env: any,
  ctx: any
): Promise<Response> {

  const storage = new DatabaseStorage(env);
  const url = new URL(request.url);
  const method = request.method;

  try { // 모든 라우트 핸들링을 try-catch로 감싸서 ResponseError를 중앙에서 처리

    // =========================
    // AUTH ROUTES
    // =========================
    // 사용자 등록
    if (method === "POST" && url.pathname === "/api/auth/register") {
      const { user, token } = await handleRegister(request, env);
      return json({ user, token }, 201);
    }

    // 사용자 로그인
    if (method === "POST" && url.pathname === "/api/auth/login") {
      const { user, token, mfaRequired } = await handleLogin(request, env);
      if (mfaRequired) {
        return json({ mfaRequired: true }, 200);
      }
      return json({ user, token }, 200);
    }

    // 현재 사용자 정보 가져오기 (인증 필요)
    if (method === "GET" && url.pathname === "/api/auth/me") {
      await authenticateJwt(request, env); // JWT 인증 미들웨어
      requireAuth(request); // 인증 확인
      // @ts-ignore
      return json(request.user);
    }

    // MFA 설정 (인증 필요)
    if (method === "POST" && url.pathname === "/api/auth/mfa/setup") {
      await authenticateJwt(request, env); // JWT 인증 미들웨어
      requireAuth(request); // 인증 확인
      // @ts-ignore
      const mfaResponse = await handleMfaSetup(request, env, request.user);
      return json(mfaResponse);
    }

    // MFA 검증 및 활성화 (인증 필요)
    if (method === "POST" && url.pathname === "/api/auth/mfa/verify") {
      await authenticateJwt(request, env); // JWT 인증 미들웨어
      requireAuth(request); // 인증 확인
      // @ts-ignore
      const result = await handleMfaVerify(request, env, request.user);
      return json(result);
    }

    // =========================
    // NEWS LIST (인증 없이 접근 가능)
    // =========================
    if (method === "GET" && /^\/api\/news\/?$/.test(url.pathname)) {
      const news = await storage.getNews();
      return json(news);
    }

    // =========================
    // NEWS GET (인증 없이 접근 가능)
    // =========================
    if (method === "GET" && /^\/api\/news\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/").pop());
      const news = await storage.getNewsItem(id);

      if (!news) throw new ResponseError("News not found", 404);
      return json(news);
    }

    // =========================
    // NEWS CREATE (인증 및 'admin' 또는 'editor' 역할 필요)
    // =========================
    if (method === "POST" && /^\/api\/news\/?$/.test(url.pathname)) {
      await authenticateJwt(request, env); // JWT 인증
      // @ts-ignore
      requireRole(request, ["admin", "editor"]); // 'admin' 또는 'editor' 역할 필요
      
      const body = await safeJson(request);

      try {
        const news = await storage.createNews(body);
        return json(news, 201);
      } catch (error: any) {
        throw new ResponseError(error.message || "Failed to create news", 500);
      }
    }

    // =========================
    // AI ANALYZE (인증 및 'admin' 또는 'editor' 역할 필요)
    // =========================
    if (method === "POST" && /^\/api\/news\/\d+\/analyze$/.test(url.pathname)) {
      await authenticateJwt(request, env); // JWT 인증
      // @ts-ignore
      requireRole(request, ["admin", "editor"]); // 'admin' 또는 'editor' 역할 필요
      
      const id = Number(url.pathname.split("/")[3]);
      const newsItem = await storage.getNewsItem(id);

      if (!newsItem) throw new ResponseError("News not found", 404);

      try {
        const prompt = `
Analyze this news article:

Title: ${newsItem.title}
Content: ${newsItem.content}

Return JSON with:
- summary
- reaction
- question
`;

        const aiResult = await callOpenAI(prompt, env);

        const updatedNews = await storage.updateNewsAnalysis(id, {
          summary: aiResult.summary || "Summary not available.",
          reaction: aiResult.reaction,
          discussionQuestion: aiResult.question,
          analysis: "Completed" // analysis 필드 업데이트
        });

        return json(updatedNews);
      } catch (error: any) {
        throw new ResponseError(error.message || "AI Analysis failed", 500);
      }
    }

    // =========================
    // COMMENTS LIST (인증 없이 접근 가능)
    // =========================
    if (method === "GET" && /^\/api\/news\/\d+\/comments$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/")[3]);
      const comments = await storage.getComments(id);
      return json(comments);
    }

    // =========================
    // COMMENTS CREATE (인증 필요)
    // =========================
    if (method === "POST" && /^\/api\/news\/\d+\/comments$/.test(url.pathname)) {
      await authenticateJwt(request, env); // JWT 인증
      requireAuth(request); // 인증 확인
      
      const id = Number(url.pathname.split("/")[3]);
      const body = await safeJson(request);

      try {
        const comment = await storage.createComment({
          content: body.content,
          newsId: id,
          // @ts-ignore
          userId: request.user!.id, // 인증된 사용자 ID 사용
        });

        return json(comment, 201);
      } catch (error: any) {
        throw new ResponseError(error.message || "Failed to create comment", 500);
      }
    }

    // =========================
    // MEDIA LIST (인증 없이 접근 가능)
    // =========================
    if (method === "GET" && /^\/api\/media\/?$/.test(url.pathname)) {
      const media = await storage.getMedia();
      return json(media);
    }

    // =========================
    // STATS (인증 없이 접근 가능)
    // =========================
    if (method === "GET" && /^\/api\/stats\/?$/.test(url.pathname)) {
      const stats = await storage.getStats();

      return json({
        ...stats,
        activeUsers: Math.floor(Math.random() * 50) + 10,
      });
    }

    // 일치하는 라우트가 없는 경우
    return new Response("Not Found", { status: 404 });

  } catch (error: any) {
    if (error instanceof ResponseError) {
      return json({ message: error.message }, error.status);
    }
    // 예상치 못한 에러
    return json({ message: "서버 내부 오류 발생", error: error.message }, 500);
  }
}
