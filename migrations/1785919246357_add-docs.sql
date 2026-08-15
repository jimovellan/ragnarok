-- Up Migration

CREATE TABLE IF NOT EXISTS docs (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    doc_reference TEXT,
    path TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS docs_tag_idx ON docs (tag);

-- Content lives only here, split into chunks, joined to docs via the string `key` (see the
-- equivalent comment on knowledge_vectors in the init migration for why: stable/reassignable
-- independent of the numeric primary key).
CREATE TABLE IF NOT EXISTS doc_vectors (
    id SERIAL PRIMARY KEY,
    doc_key TEXT NOT NULL REFERENCES docs (key) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doc_vectors_doc_key_idx ON doc_vectors (doc_key);
CREATE INDEX IF NOT EXISTS doc_vectors_embedding_idx ON doc_vectors USING hnsw (embedding vector_cosine_ops);

-- Down Migration

DROP TABLE IF EXISTS doc_vectors;
DROP TABLE IF EXISTS docs;
