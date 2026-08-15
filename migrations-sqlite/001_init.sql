CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    tag TEXT,
    namespace TEXT,
    summary TEXT,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- pgvector has no SQLite equivalent, so the embedding is stored as a JSON-encoded array of
-- numbers and cosine distance is computed in application code (see knowledge-search.utils.ts).
CREATE TABLE IF NOT EXISTS knowledge_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_key TEXT NOT NULL REFERENCES knowledge (key) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS knowledge_vectors_knowledge_key_idx ON knowledge_vectors (knowledge_key);
