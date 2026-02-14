import { DatabaseStorage } from "./storage";
import { z } from "zod";

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
    throw new Error("OpenAI request failed");
  }

  const data: any = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

export async function registerRoutes(
  request: Request,
  env: any,
  ctx: any
): Promise<Response> {

  const storage = new DatabaseStorage(env);
  const url = new URL(request.url);
  const method = request.method;

  // 🔥 ROOT (404 방지용)
  if (url.pathname === "/") {
    return json({ status: "Worker Running" });
  }

  // =========================
  // NEWS LIST
  // =========================
  if (method === "GET" && /^\/api\/news\/?$/.test(url.pathname)) {
    const news = await storage.getNews();
    return json(news);
  }

  // =========================
  // NEWS GET
  // =========================
  if (method === "GET" && /^\/api\/news\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").pop());
    const news = await storage.getNewsItem(id);

    if (!news) return json({ message: "News not found" }, 404);
    return json(news);
  }

  // =========================
  // NEWS CREATE
  // =========================
  if (method === "POST" && /^\/api\/news\/?$/.test(url.pathname)) {
    const body = await safeJson(request);

    try {
      const news = await storage.createNews(body);
      return json(news, 201);
    } catch {
      return json({ message: "Failed to create news" }, 500);
    }
  }

  // =========================
  // AI ANALYZE
  // =========================
  if (method === "POST" && /^\/api\/news\/\d+\/analyze$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[3]);
    const newsItem = await storage.getNewsItem(id);

    if (!newsItem) return json({ message: "News not found" }, 404);

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
        reaction: aiResult.reaction || "Reaction pending.",
        question: aiResult.question || "What do you think?",
      });

      return json(updatedNews);
    } catch {
      return json({ message: "AI Analysis failed" }, 500);
    }
  }

  // =========================
  // COMMENTS LIST
  // =========================
  if (method === "GET" && /^\/api\/news\/\d+\/comments$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[3]);
    const comments = await storage.getComments(id);
    return json(comments);
  }

  // =========================
  // COMMENTS CREATE
  // =========================
  if (method === "POST" && /^\/api\/news\/\d+\/comments$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[3]);
    const body = await safeJson(request);

    try {
      const comment = await storage.createComment({
        content: body.content,
        newsId: id,
        userId: 1, // 임시
      });

      return json(comment, 201);
    } catch {
      return json({ message: "Failed to create comment" }, 500);
    }
  }

  // =========================
  // MEDIA LIST
  // =========================
  if (method === "GET" && /^\/api\/media\/?$/.test(url.pathname)) {
    const media = await storage.getMedia();
    return json(media);
  }

  // =========================
  // STATS
  // =========================
  if (method === "GET" && /^\/api\/stats\/?$/.test(url.pathname)) {
    const stats = await storage.getStats();

    return json({
      ...stats,
      activeUsers: Math.floor(Math.random() * 50) + 10,
    });
  }

  return new Response("Not Found", { status: 404 });
}

// =========================
// Helpers
// =========================
async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function json(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
