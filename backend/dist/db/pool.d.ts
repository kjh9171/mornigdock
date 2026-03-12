export declare function query<T extends Record<string, any> = any>(text: string, params?: (string | number | boolean | null | undefined)[]): Promise<{
    rows: T[];
    rowCount: number;
}>;
export declare function transaction<T>(fn: (client: any) => Promise<T>): Promise<T>;
export declare function checkDbConnection(): Promise<boolean>;
export declare const pool: {
    query: (text: string, params?: any[]) => Promise<{
        rows: any[];
        rowCount: number;
    }>;
    end: () => Promise<void>;
};
//# sourceMappingURL=pool.d.ts.map