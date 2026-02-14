import {
  users,
  news,
  comments,
  media,
  type User,
  type InsertUser,
  type News,
  type InsertNews,
  type Comment,
  type InsertComment,
  type Media,
  type InsertMedia
} from "@shared/schema";

import { eq, desc } from "drizzle-orm";
import { createDb } from "./db";

export class DatabaseStorage {
  constructor(private env: any) {}

  private get db() {
    return createDb(this.env);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
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

  async createUser(insertUser: InsertUser) {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserMfa(userId: number, secret: string, enabled: boolean) {
    await this.db.update(users)
      .set({ mfaSecret: secret, isMfaEnabled: enabled })
      .where(eq(users.id, userId));
  }

  // News
  async getNews() {
    return await this.db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getNewsItem(id: number) {
    const [item] = await this.db.select().from(news).where(eq(news.id, id));
    return item;
  }

  async createNews(insertNews: InsertNews) {
    const [item] = await this.db.insert(news).values(insertNews).returning();
    return item;
  }

  async updateNewsAnalysis(id: number, analysis: any) {
    const [item] = await this.db.update(news)
      .set({
        summary: analysis.summary,
        generationalReaction: analysis.reaction,
        discussionQuestion: analysis.question,
        analysis: "Completed"
      })
      .where(eq(news.id, id))
      .returning();
    return item;
  }

  // Comments
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

  async createComment(insertComment: InsertComment) {
    const [comment] = await this.db.insert(comments).values(insertComment).returning();
    return comment;
  }

  // Media
  async getMedia() {
    return await this.db.select().from(media).orderBy(desc(media.createdAt));
  }

  async createMedia(insertMedia: InsertMedia) {
    const [item] = await this.db.insert(media).values(insertMedia).returning();
    return item;
  }

  // Stats
  async getStats() {
    const usersCount = await this.db.$count(users);
    const newsCount = await this.db.$count(news);
    return { usersCount, newsCount };
  }
}
