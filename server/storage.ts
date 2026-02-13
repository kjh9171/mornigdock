import { users, news, comments, media, type User, type InsertUser, type News, type InsertNews, type Comment, type InsertComment, type Media, type InsertMedia } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserMfa(userId: number, secret: string, enabled: boolean): Promise<void>;

  // News
  getNews(): Promise<News[]>;
  getNewsItem(id: number): Promise<News | undefined>;
  createNews(newsItem: InsertNews): Promise<News>;
  updateNewsAnalysis(id: number, analysis: { summary: string; reaction: string; question: string }): Promise<News>;

  // Comments
  getComments(newsId: number): Promise<(Comment & { user: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Media
  getMedia(): Promise<Media[]>;
  createMedia(mediaItem: InsertMedia): Promise<Media>;

  // Stats
  getStats(): Promise<{ usersCount: number; newsCount: number }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserMfa(userId: number, secret: string, enabled: boolean): Promise<void> {
    await db.update(users)
      .set({ mfaSecret: secret, isMfaEnabled: enabled })
      .where(eq(users.id, userId));
  }

  // News
  async getNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getNewsItem(id: number): Promise<News | undefined> {
    const [item] = await db.select().from(news).where(eq(news.id, id));
    return item;
  }

  async createNews(insertNews: InsertNews): Promise<News> {
    const [item] = await db.insert(news).values(insertNews).returning();
    return item;
  }

  async updateNewsAnalysis(id: number, analysis: { summary: string; reaction: string; question: string }): Promise<News> {
    const [item] = await db.update(news)
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
  async getComments(newsId: number): Promise<(Comment & { user: User })[]> {
    return await db.select({
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

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  // Media
  async getMedia(): Promise<Media[]> {
    return await db.select().from(media).orderBy(desc(media.createdAt));
  }

  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const [item] = await db.insert(media).values(insertMedia).returning();
    return item;
  }

  // Stats
  async getStats(): Promise<{ usersCount: number; newsCount: number }> {
    const usersCount = await db.$count(users);
    const newsCount = await db.$count(news);
    return { usersCount, newsCount };
  }
}

export const storage = new DatabaseStorage();
