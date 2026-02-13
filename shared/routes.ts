import { z } from "zod";
import { insertUserSchema, insertNewsSchema, insertCommentSchema, insertMediaSchema, users, news, comments, media } from "./schema";

// === SHARED ERROR SCHEMAS ===
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// === API CONTRACT ===
export const api = {
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: z.object({
        email: z.string().email(),
        password: z.string(),
        token: z.string().optional(), // MFA Token
      }),
      responses: {
        200: z.object({
          user: z.custom<typeof users.$inferSelect>(),
          mfaRequired: z.boolean().optional(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
      },
    },
    setupMfa: {
      method: "POST" as const,
      path: "/api/auth/mfa/setup" as const,
      responses: {
        200: z.object({
          secret: z.string(),
          qrCode: z.string(),
        }),
      },
    },
    verifyMfa: {
      method: "POST" as const,
      path: "/api/auth/mfa/verify" as const,
      input: z.object({
        token: z.string(),
        secret: z.string().optional(),
      }),
      responses: {
        200: z.void(),
        400: errorSchemas.validation,
      },
    },
  },
  news: {
    list: {
      method: "GET" as const,
      path: "/api/news" as const,
      responses: {
        200: z.array(z.custom<typeof news.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/news/:id" as const,
      responses: {
        200: z.custom<typeof news.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/news" as const,
      input: insertNewsSchema,
      responses: {
        201: z.custom<typeof news.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    analyze: { // Special endpoint to trigger AI analysis
      method: "POST" as const,
      path: "/api/news/:id/analyze" as const,
      responses: {
        200: z.custom<typeof news.$inferSelect>(),
      },
    },
  },
  comments: {
    list: {
      method: "GET" as const,
      path: "/api/news/:newsId/comments" as const,
      responses: {
        200: z.array(z.custom<typeof comments.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/news/:newsId/comments" as const,
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof comments.$inferSelect>(),
      },
    },
  },
  media: {
    list: {
      method: "GET" as const,
      path: "/api/media" as const,
      responses: {
        200: z.array(z.custom<typeof media.$inferSelect>()),
      },
    },
  },
  stats: {
    get: {
      method: "GET" as const,
      path: "/api/stats" as const,
      responses: {
        200: z.object({
          usersCount: z.number(),
          newsCount: z.number(),
          activeUsers: z.number(),
        }),
      },
    },
  },
};

// === HELPERS ===
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}

// === TYPES ===
export type LoginResponse = z.infer<typeof api.auth.login.responses[200]>;
export type NewsListResponse = z.infer<typeof api.news.list.responses[200]>;
