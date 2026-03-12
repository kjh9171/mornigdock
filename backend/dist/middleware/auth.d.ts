import { Context, Next } from 'hono';
export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
declare module 'hono' {
    interface ContextVariableMap {
        user: JwtPayload;
    }
}
export declare function requireAuth(roles?: string[]): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: false;
    message: string;
}, 401, "json">) | (Response & import("hono").TypedResponse<{
    success: false;
    message: string;
}, 403, "json">) | undefined>;
export declare function optionalAuth(): (c: Context, next: Next) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map