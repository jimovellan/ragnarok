export type DbEngine = 'sqlite' | 'postgres';

export const config = {
    ollamaBaseUrl: process.env['OLLAMA_BASE_URL'] ?? 'http://192.168.1.42:11434',
    ollamaEmbeddingModel: process.env['OLLAMA_EMBEDDING_MODEL'] ?? 'paraphrase-multilingual',
    dbEngine: (process.env['DB_ENGINE'] === 'sqlite' ? 'sqlite' : 'postgres') as DbEngine,
    postgres: {
        host: process.env['POSTGRES_HOST'] ?? '192.168.1.42',
        port: Number(process.env['POSTGRES_PORT'] ?? 5432),
        user: process.env['POSTGRES_USER'] ?? 'Jim',
        password: process.env['POSTGRES_PASSWORD'] ?? '',
        database: process.env['POSTGRES_DB'] ?? 'docs',
    },
    sqlite: {
        path: process.env['SQLITE_PATH'] ?? './data/knowledge.sqlite',
    },
    chunking: {
        maxChars: Number(process.env['CHUNK_MAX_CHARS'] ?? 2000),
        overlapChars: Number(process.env['CHUNK_OVERLAP_CHARS'] ?? 200),
    },
};
