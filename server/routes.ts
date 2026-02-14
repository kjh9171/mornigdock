import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

/**
 * Workers용 OpenAI 호출 (Node SDK 제거)
 */
async function callOpenAI(prompt: string, env: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
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

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content || "{}");
}

/**
 * Workers 라우터
 */
export async function registerRoutes(
  request: Request,
  env: any,
  ctx: any
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // JSON body helper
  const parseBody = async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  };

  // === NEWS LIST ===
  if (method === "GET" && url.pathname === api.news.list.path) {
    const news = await storage.getNews();
    return json(news);
  }

  // === NEWS GET ===
  if (method === "GET" && url.pathname.match(/^\/api\/news\/\d+$/)) {
    const id = Number(url.pathname.split("/").pop());
    const news = await storage.getNewsItem(id);
    if (!news) return json({ message: "News not found" }, 404);
    return json(news);
  }

  // === NEWS CREATE ===
  if (method === "POST" && url.pathname === api.news.create.path) {
    const body = await parseBody();
    try {
      const input = api.news.create.input.parse(body);
      const news = await storage.createNews(input);
      return json(news, 201);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return json({ message: e.errors[0].message }, 400);
      }
      return json({ message: "Internal Server Error" }, 500);
    }
  }

  // === AI ANALYSIS ===
  if (method === "POST" && url.pathname.match(/^\/api\/news\/\d+\/analyze$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const newsItem = await storage.getNewsItem(id);
    if (!newsItem) return json({ message: "News not found" }, 404);

    try {
      const prompt = `
Analyze this news article for the Antigravity platform:

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
        reaction: aiResult.reaction || "Reaction analysis pending.",
        question: aiResult.question || "What do you think?",
      });

      return json(updatedNews);
    } catch (error) {
      return json({ message: "AI Analysis failed" }, 500);
    }
  }

  // === COMMENTS LIST ===
  if (method === "GET" && url.pathname.match(/^\/api\/news\/\d+\/comments$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const comments = await storage.getComments(id);
    return json(comments);
  }

  // === COMMENTS CREATE ===
  if (method === "POST" && url.pathname.match(/^\/api\/news\/\d+\/comments$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const body = await parseBody();

    try {
      const comment = await storage.createComment({
        content: body.content,
        newsId: id,
        userId: 1, // ⚠️ 임시 고정 (Auth 제거 상태)
      });

      return json(comment, 201);
    } catch {
      return json({ message: "Failed to create comment" }, 500);
    }
  }

  // === MEDIA LIST ===
  if (method === "GET" && url.pathname === api.media.list.path) {
    const media = await storage.getMedia();
    return json(media);
  }

  // === STATS ===
  if (method === "GET" && url.pathname === api.stats.get.path) {
    const stats = await storage.getStats();
    return json({
      ...stats,
      activeUsers: Math.floor(Math.random() * 50) + 10,
    });
  }

  return new Response("Not Found", { status: 404 });
}

/**
 * JSON Helper
 */
function json(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
