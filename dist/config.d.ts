export type DbEngine = 'sqlite' | 'postgres';
export declare const config: {
    ollamaBaseUrl: string;
    ollamaEmbeddingModel: string;
    dbEngine: DbEngine;
    postgres: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    sqlite: {
        path: string;
    };
    chunking: {
        maxChars: number;
        overlapChars: number;
    };
};
//# sourceMappingURL=config.d.ts.map