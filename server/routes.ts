import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI (using Replit integration env vars)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Setup Auth (Passport strategy + MFA helpers)
  setupAuth(app);

  // === NEWS ROUTES ===
  app.get(api.news.list.path, async (req, res) => {
    const news = await storage.getNews();
    res.json(news);
  });

  app.get(api.news.get.path, async (req, res) => {
    const news = await storage.getNewsItem(Number(req.params.id));
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  });

  app.post(api.news.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.news.create.input.parse(req.body);
      const news = await storage.createNews(input);
      res.status(201).json(news);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: e.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // AI Analysis Endpoint
  app.post(api.news.analyze.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const newsItem = await storage.getNewsItem(id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    try {
      // Call OpenAI
      const prompt = `
        Analyze this news article for the Antigravity platform (Generational News Analysis):
        Title: ${newsItem.title}
        Content: ${newsItem.content}

        Output JSON with these fields:
        - summary: A 3-line easy-to-understand summary.
        - reaction: Expected reactions from Gen Z, Millennials, and Boomers.
        - question: One provocative discussion question to spark debate.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2", // Replit integration model
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(completion.choices[0].message.content || "{}");
      
      const updatedNews = await storage.updateNewsAnalysis(id, {
        summary: content.summary || "Summary not available.",
        reaction: content.reaction || "Reaction analysis pending.",
        question: content.question || "What do you think?",
      });

      res.json(updatedNews);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({ message: "AI Analysis failed" });
    }
  });

  // === COMMENTS ROUTES ===
  app.get(api.comments.list.path, async (req, res) => {
    const comments = await storage.getComments(Number(req.params.newsId));
    res.json(comments);
  });

  app.post(api.comments.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { content } = req.body;
      const comment = await storage.createComment({
        content,
        newsId: Number(req.params.newsId),
        userId: req.user!.id,
      });
      res.status(201).json(comment);
    } catch (e) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // === MEDIA ROUTES ===
  app.get(api.media.list.path, async (req, res) => {
    const media = await storage.getMedia();
    res.json(media);
  });

  // === STATS ROUTES ===
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    // Mock active users for now (or use session store size if available)
    res.json({ ...stats, activeUsers: Math.floor(Math.random() * 50) + 10 }); 
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const news = await storage.getNews();
  if (news.length === 0) {
    await storage.createNews({
      title: "Global Tech Summit 2026 Announced",
      content: "The annual Global Tech Summit will be held in Seoul this year, focusing on AI ethics and quantum computing advancements. Leaders from major tech companies are expected to attend.",
      sourceUrl: "https://example.com/tech-summit",
      category: "Technology",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    });
    
    await storage.createNews({
      title: "New Eco-Friendly Urban Planning Initiative",
      content: "City council reveals plans for 'Green Corridors' connecting major parks. The initiative aims to reduce urban heat islands and promote pedestrian traffic.",
      sourceUrl: "https://example.com/green-city",
      category: "Environment",
      imageUrl: "https://images.unsplash.com/photo-1449824913929-4bdd42b00fb3?auto=format&fit=crop&w=1000&q=80",
    });
  }

  const media = await storage.getMedia();
  if (media.length === 0) {
    await storage.createMedia({
      title: "Morning Briefing - Feb 12",
      artist: "Antigravity AI",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Demo MP3
      type: "briefing",
      coverUrl: "https://placehold.co/400x400/1e293b/FFF?text=Briefing",
    });
    await storage.createMedia({
      title: "Focus Flow",
      artist: "LoFi Beats",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", // Demo MP3
      type: "music",
      coverUrl: "https://placehold.co/400x400/f59e0b/FFF?text=Music",
    });
  }
}
