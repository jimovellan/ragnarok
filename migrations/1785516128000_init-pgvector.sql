-- Up Migration

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    tag TEXT,
    namespace TEXT,
    summary TEXT,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings live in their own table, joined to knowledge via the string `key`
-- (not the internal serial `id`) so the vector rows stay stable/reassignable
-- independent of the numeric primary key.
CREATE TABLE IF NOT EXISTS knowledge_vectors (
    id SERIAL PRIMARY KEY,
    knowledge_key TEXT NOT NULL REFERENCES knowledge (key) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_vectors_knowledge_key_idx ON knowledge_vectors (knowledge_key);
CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_idx ON knowledge_vectors USING hnsw (embedding vector_cosine_ops);

-- Down Migration

DROP TABLE IF EXISTS knowledge_vectors;
DROP TABLE IF EXISTS knowledge;
DROP EXTENSION IF EXISTS vector;
