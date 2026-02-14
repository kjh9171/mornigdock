import {
  users,
  news,
  comments,
  media,
  type InsertUser,
  type InsertNews,
  type InsertComment,
  type InsertMedia
} from "@shared/schema";

import { eq, desc, sql } from "drizzle-orm";
import { createDb } from "./db";

export class DatabaseStorage {
  constructor(private env: any) {}

  private get db() {
    return createDb(this.env);
  }

  // =========================
  // Users
  // =========================
  async getUser(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: InsertUser) {
    await this.db.insert(users).values(data);
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, data.username));
    return user;
  }

  async updateUserMfa(userId: number, secret: string, enabled: boolean) {
    await this.db
      .update(users)
      .set({ mfaSecret: secret, isMfaEnabled: enabled })
      .where(eq(users.id, userId));
  }

  // =========================
  // News
  // =========================
  async getNews() {
    return await this.db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getNewsItem(id: number) {
    const [item] = await this.db.select().from(news).where(eq(news.id, id));
    return item;
  }

  async createNews(data: InsertNews) {
    await this.db.insert(news).values(data);
    const [item] = await this.db
      .select()
      .from(news)
      .orderBy(desc(news.id));
    return item;
  }

  async updateNewsAnalysis(id: number, analysis: any) {
    await this.db.update(news)
      .set({
        summary: analysis.summary,
        generationalReaction: analysis.reaction,
        discussionQuestion: analysis.question,
        analysis: "Completed"
      })
      .where(eq(news.id, id));

    return this.getNewsItem(id);
  }

  // =========================
  // Comments
  // =========================
  async getComments(newsId: number) {
    return await this.db.select({
      id: comments.id,
      userId: comments.userId,
      newsId: comments.newsId,
      content: comments.content,
      createdAt: comments.createdAt,
      user: users,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.newsId, newsId))
    .orderBy(desc(comments.createdAt));
  }

  async createComment(data: InsertComment) {
    await this.db.insert(comments).values(data);
    const [comment] = await this.db
      .select()
      .from(comments)
      .orderBy(desc(comments.id));
    return comment;
  }

  // =========================
  // Media
  // =========================
  async getMedia() {
    return await this.db.select().from(media).orderBy(desc(media.createdAt));
  }

  async createMedia(data: InsertMedia) {
    await this.db.insert(media).values(data);
    const [item] = await this.db
      .select()
      .from(media)
      .orderBy(desc(media.id));
    return item;
  }

  // =========================
  // Stats (D1-safe)
  // =========================
  async getStats() {
    const usersCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const newsCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(news);

    return {
      usersCount: usersCountResult[0]?.count ?? 0,
      newsCount: newsCountResult[0]?.count ?? 0,
    };
  }
}
