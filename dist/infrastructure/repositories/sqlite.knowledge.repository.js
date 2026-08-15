import { randomUUID } from "node:crypto";
import { openSqliteDatabase } from "./sqlite.connection.js";
import { MAX_VECTOR_DISTANCE, cosineDistance, significantWords } from "./knowledge-search.utils.js";
import { buildChunkTexts } from "./chunking.utils.js";
import { config } from "../../config.js";
const COLUMNS = "id, key, title, tag, namespace, summary, content, reference, store_content, version, active, created_at, updated_at";
const UPDATABLE_COLUMN_BY_FIELD = {
    title: "title",
    tag: "tag",
    namespace: "namespace",
    summary: "summary",
    content: "content",
    reference: "reference",
    storeContent: "store_content",
    version: "version",
    active: "active",
};
function toKnowledge(row) {
    return {
        id: row.id,
        key: row.key,
        title: row.title,
        tag: row.tag,
        namespace: row.namespace,
        summary: row.summary,
        content: row.content,
        reference: row.reference,
        storeContent: row.store_content === 1,
        version: row.version,
        active: row.active === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
function toKnowledgeSummary(row) {
    return {
        id: row.id,
        key: row.key,
        title: row.title,
        tag: row.tag,
        namespace: row.namespace,
        summary: row.summary,
        reference: row.reference,
    };
}
function matchesAllWords(haystack, words) {
    const lower = haystack.toLowerCase();
    return words.every((word) => lower.includes(word.toLowerCase()));
}
function buildSetClause(changes, params) {
    const assignments = [];
    for (const field of Object.keys(UPDATABLE_COLUMN_BY_FIELD)) {
        const value = changes[field];
        if (value !== undefined) {
            const column = UPDATABLE_COLUMN_BY_FIELD[field];
            const isBooleanColumn = column === "active" || column === "store_content";
            params.push((isBooleanColumn ? (value ? 1 : 0) : value));
            assignments.push(`${column} = ?`);
        }
    }
    assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    return assignments.join(", ");
}
// SQLite has no pgvector equivalent: embeddings are stored as JSON text and cosine distance
// is computed in JS (see knowledge-search.utils.ts) instead of in SQL. Fine for the small,
// single-file datasets this engine is meant for; PostgresKnowledgeRepository is the scalable path.
export class SqliteKnowledgeRepository {
    embedingService;
    db;
    constructor(embedingService) {
        this.embedingService = embedingService;
        this.db = openSqliteDatabase();
    }
    async create(knowledge) {
        const key = randomUUID();
        // Chunking always uses the given content, even when storeContent is false and it won't be
        // persisted.
        const chunks = buildChunkTexts(knowledge, config.chunking.maxChars, config.chunking.overlapChars);
        const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
        const contentToStore = knowledge.storeContent ? knowledge.content : "";
        this.db.exec("BEGIN");
        try {
            const row = this.db
                .prepare(`INSERT INTO knowledge (key, title, tag, namespace, summary, content, reference, store_content, version, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING ${COLUMNS}`)
                .get(key, knowledge.title, knowledge.tag, knowledge.namespace, knowledge.summary, contentToStore, knowledge.reference, knowledge.storeContent ? 1 : 0, knowledge.version, knowledge.active ? 1 : 0);
            if (!row) {
                throw new Error("Failed to create knowledge entry");
            }
            const insertVector = this.db.prepare("INSERT INTO knowledge_vectors (knowledge_key, embedding) VALUES (?, ?)");
            for (const embedding of embeddings) {
                insertVector.run(key, JSON.stringify(embedding));
            }
            this.db.exec("COMMIT");
            return toKnowledge(row);
        }
        catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }
    }
    async search(query, limit = 5, tag, namespace) {
        const embedding = await this.embedingService.generate(query);
        const words = significantWords(query);
        const conditions = ["k.active = 1"];
        const params = [];
        if (tag) {
            conditions.push("k.tag = ?");
            params.push(tag);
        }
        if (namespace) {
            conditions.push("k.namespace = ?");
            params.push(namespace);
        }
        const rows = this.db
            .prepare(`SELECT ${COLUMNS.split(", ").map((c) => `k.${c}`).join(", ")}, v.embedding
         FROM knowledge k
         JOIN knowledge_vectors v ON v.knowledge_key = k.key
         WHERE ${conditions.join(" AND ")}`)
            .all(...params);
        const scored = rows.map((row) => {
            const distance = cosineDistance(embedding, JSON.parse(row.embedding));
            const literalMatch = matchesAllWords(`${row.title} ${row.tag} ${row.summary} ${row.content}`, words);
            return { row, distance, literalMatch };
        });
        // A chunked entry has one knowledge_vectors row per chunk, so `scored` can contain several
        // entries per key; keep only the closest chunk per key before ranking entries against
        // each other.
        const bestByKey = new Map();
        for (const entry of scored) {
            const current = bestByKey.get(entry.row.key);
            if (!current || entry.distance < current.distance) {
                bestByKey.set(entry.row.key, entry);
            }
        }
        return [...bestByKey.values()]
            .filter((entry) => entry.distance < MAX_VECTOR_DISTANCE || entry.literalMatch)
            .sort((a, b) => Number(b.literalMatch) - Number(a.literalMatch) || a.distance - b.distance)
            .slice(0, limit)
            .map((entry) => toKnowledgeSummary(entry.row));
    }
    async listNamespaces() {
        const rows = this.db
            .prepare("SELECT DISTINCT namespace FROM knowledge WHERE active = 1 AND namespace IS NOT NULL ORDER BY namespace")
            .all();
        return rows.map((row) => row.namespace);
    }
    async listTags() {
        const rows = this.db
            .prepare("SELECT DISTINCT tag FROM knowledge WHERE active = 1 AND tag IS NOT NULL ORDER BY tag")
            .all();
        return rows.map((row) => row.tag);
    }
    async getById(id) {
        const row = this.db.prepare(`SELECT ${COLUMNS} FROM knowledge WHERE id = ?`).get(id);
        return row ? toKnowledge(row) : null;
    }
    async getByKey(key) {
        const row = this.db.prepare(`SELECT ${COLUMNS} FROM knowledge WHERE key = ?`).get(key);
        return row ? toKnowledge(row) : null;
    }
    async updateById(id, changes) {
        const params = [];
        const setClause = buildSetClause(changes, params);
        params.push(id);
        return this.updateAndRefreshEmbedding(`UPDATE knowledge SET ${setClause} WHERE id = ? RETURNING ${COLUMNS}`, params, changes, `Knowledge with id ${id} not found`);
    }
    async updateByKey(key, changes) {
        const params = [];
        const setClause = buildSetClause(changes, params);
        params.push(key);
        return this.updateAndRefreshEmbedding(`UPDATE knowledge SET ${setClause} WHERE key = ? RETURNING ${COLUMNS}`, params, changes, `Knowledge with key ${key} not found`);
    }
    async updateAndRefreshEmbedding(updateSql, params, changes, notFoundMessage) {
        const affectsEmbedding = changes.title !== undefined || changes.summary !== undefined || changes.content !== undefined;
        this.db.exec("BEGIN");
        try {
            let row = this.db.prepare(updateSql).get(...params);
            if (!row) {
                throw new Error(notFoundMessage);
            }
            if (affectsEmbedding) {
                // Chunk count can change between updates, so replace all of this entry's vector rows
                // rather than trying to update them in place. Uses row.content (the value just written
                // by updateSql above) even if storeContent is false, since it's cleared out below only
                // after being used here.
                const chunks = buildChunkTexts(row, config.chunking.maxChars, config.chunking.overlapChars);
                const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
                this.db.prepare("DELETE FROM knowledge_vectors WHERE knowledge_key = ?").run(row.key);
                const insertVector = this.db.prepare("INSERT INTO knowledge_vectors (knowledge_key, embedding) VALUES (?, ?)");
                for (const chunkEmbedding of embeddings) {
                    insertVector.run(row.key, JSON.stringify(chunkEmbedding));
                }
            }
            // storeContent = false means content is never persisted: blank it out now that it's been
            // used above (if this update touched the embedding) to compute chunk embeddings.
            if (row.store_content === 0 && row.content !== "") {
                row = this.db
                    .prepare(`UPDATE knowledge SET content = '' WHERE key = ? RETURNING ${COLUMNS}`)
                    .get(row.key);
            }
            this.db.exec("COMMIT");
            return toKnowledge(row);
        }
        catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }
    }
    async removeById(id) {
        this.db.prepare("DELETE FROM knowledge WHERE id = ?").run(id);
    }
    async removeByKey(key) {
        this.db.prepare("DELETE FROM knowledge WHERE key = ?").run(key);
    }
}
//# sourceMappingURL=sqlite.knowledge.repository.js.map