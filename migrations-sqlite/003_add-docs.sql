CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    doc_reference TEXT,
    path TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    tag TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS docs_tag_idx ON docs (tag);

-- Content lives only here, split into chunks, joined to docs via `key` (see knowledge_vectors
-- for the SQLite/pgvector split rationale: embedding stored as JSON text, distance computed
-- in JS by knowledge-search.utils.ts's cosineDistance()).
CREATE TABLE IF NOT EXISTS doc_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_key TEXT NOT NULL REFERENCES docs (key) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS doc_vectors_doc_key_idx ON doc_vectors (doc_key);
