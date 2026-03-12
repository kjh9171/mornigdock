type Env = {
    ASSETS: {
        fetch: (req: Request) => Promise<Response>;
    };
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV: string;
    WORKER: string;
};
declare const _default: {
    fetch(request: Request, env: Env, ctx: any): Promise<Response>;
    scheduled(event: any, env: Env, ctx: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map