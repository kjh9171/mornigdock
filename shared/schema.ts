import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  isMfaEnabled: boolean("is_mfa_enabled").default(false).notNull(),
  mfaSecret: text("mfa_secret"), // Nullable until setup
  createdAt: timestamp("created_at").defaultNow(),
});

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // 3-line summary
  analysis: text("analysis"), // AI Analysis
  generationalReaction: text("generational_reaction"), // Generation-specific reaction
  discussionQuestion: text("discussion_question"), // Discussion starter
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  category: text("category").default("general"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  newsId: integer("news_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  url: text("url").notNull(), // MP3 URL or stream
  type: text("type").default("music"), // 'music' | 'briefing'
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  news: one(news, {
    fields: [comments.newsId],
    references: [news.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
}));

export const newsRelations = relations(news, ({ many }) => ({
  comments: many(comments),
}));

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  isMfaEnabled: true, 
  mfaSecret: true 
});

export const insertNewsSchema = createInsertSchema(news).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCommentSchema = createInsertSchema(comments).omit({ 
  id: true, 
  createdAt: true 
});

export const insertMediaSchema = createInsertSchema(media).omit({ 
  id: true, 
  createdAt: true 
});

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

// Request Types
export type LoginRequest = {
  email: string;
  password: string;
  token?: string; // MFA Token
};

export type RegisterRequest = InsertUser;

export type MfaSetupResponse = {
  secret: string;
  qrCode: string;
};

export type MfaVerifyRequest = {
  token: string;
  secret?: string; // For initial setup verification
};

export type NewsAnalysisResponse = {
  summary: string;
  reaction: string;
  question: string;
};
