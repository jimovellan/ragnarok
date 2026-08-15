import { randomUUID } from "node:crypto";
import { openSqliteDatabase } from "./sqlite.connection.js";
import { MAX_VECTOR_DISTANCE, cosineDistance, significantWords } from "./knowledge-search.utils.js";
const COLUMNS = "id, key, doc_reference, path, title, summary, tag, created_at, updated_at";
const UPDATABLE_COLUMN_BY_FIELD = {
    docReference: "doc_reference",
    path: "path",
    title: "title",
    summary: "summary",
    tag: "tag",
};
function toDoc(row) {
    return {
        id: row.id,
        key: row.key,
        docReference: row.doc_reference,
        path: row.path,
        title: row.title,
        summary: row.summary,
        tag: row.tag,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
function toDocSummary(row) {
    return {
        id: row.id,
        key: row.key,
        docReference: row.doc_reference,
        path: row.path,
        title: row.title,
        summary: row.summary,
        tag: row.tag,
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
            params.push(value);
            assignments.push(`${UPDATABLE_COLUMN_BY_FIELD[field]} = ?`);
        }
    }
    assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    return assignments.join(", ");
}
// The docs table itself never stores content — that lives entirely in doc_vectors, owned by
// DocChunkRepository. This repository only manages doc metadata and delegates chunking/embedding
// to the injected DocChunkRepository whenever content is created or changed.
export class SqliteDocRepository {
    embedingService;
    docChunkRepository;
    db;
    constructor(embedingService, docChunkRepository) {
        this.embedingService = embedingService;
        this.docChunkRepository = docChunkRepository;
        this.db = openSqliteDatabase();
    }
    async create(doc) {
        const key = randomUUID();
        const row = this.db
            .prepare(`INSERT INTO docs (key, doc_reference, path, title, summary, tag)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING ${COLUMNS}`)
            .get(key, doc.docReference, doc.path, doc.title, doc.summary, doc.tag);
        if (!row) {
            throw new Error("Failed to create doc entry");
        }
        try {
            await this.docChunkRepository.insert(key, doc.content);
        }
        catch (error) {
            // Don't leave a doc behind with no content chunks if embedding/inserting them failed.
            this.db.prepare("DELETE FROM docs WHERE key = ?").run(key);
            throw error;
        }
        return toDoc(row);
    }
    async search(query, limit = 5, tag) {
        const embedding = await this.embedingService.generate(query);
        const words = significantWords(query);
        const conditions = [];
        const params = [];
        if (tag) {
            conditions.push("d.tag = ?");
            params.push(tag);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const rows = this.db
            .prepare(`SELECT ${COLUMNS.split(", ").map((c) => `d.${c}`).join(", ")}, v.embedding, v.content
         FROM docs d
         JOIN doc_vectors v ON v.doc_key = d.key
         ${whereClause}`)
            .all(...params);
        const scored = rows.map((row) => {
            const distance = cosineDistance(embedding, JSON.parse(row.embedding));
            const literalMatch = matchesAllWords(`${row.title} ${row.tag} ${row.summary} ${row.content}`, words);
            return { row, distance, literalMatch };
        });
        // A doc has one doc_vectors row per chunk, so `scored` can contain several entries per key;
        // keep only the closest chunk per key before ranking docs against each other.
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
            .map((entry) => toDocSummary(entry.row));
    }
    async listTags() {
        const rows = this.db
            .prepare("SELECT DISTINCT tag FROM docs WHERE tag IS NOT NULL ORDER BY tag")
            .all();
        return rows.map((row) => row.tag);
    }
    async getById(id) {
        const row = this.db.prepare(`SELECT ${COLUMNS} FROM docs WHERE id = ?`).get(id);
        return row ? toDoc(row) : null;
    }
    async getByKey(key) {
        const row = this.db.prepare(`SELECT ${COLUMNS} FROM docs WHERE key = ?`).get(key);
        return row ? toDoc(row) : null;
    }
    async updateById(id, changes) {
        const params = [];
        const setClause = buildSetClause(changes, params);
        params.push(id);
        return this.updateAndRefreshChunks(`UPDATE docs SET ${setClause} WHERE id = ? RETURNING ${COLUMNS}`, params, changes, `Doc with id ${id} not found`);
    }
    async updateByKey(key, changes) {
        const params = [];
        const setClause = buildSetClause(changes, params);
        params.push(key);
        return this.updateAndRefreshChunks(`UPDATE docs SET ${setClause} WHERE key = ? RETURNING ${COLUMNS}`, params, changes, `Doc with key ${key} not found`);
    }
    async updateAndRefreshChunks(updateSql, params, changes, notFoundMessage) {
        const row = this.db.prepare(updateSql).get(...params);
        if (!row) {
            throw new Error(notFoundMessage);
        }
        if (changes.content !== undefined) {
            await this.docChunkRepository.update(row.key, changes.content);
        }
        return toDoc(row);
    }
    // No explicit doc_vectors cleanup needed: doc_vectors.doc_key has ON DELETE CASCADE and
    // foreign_keys is enabled by openSqliteDatabase().
    async removeById(id) {
        this.db.prepare("DELETE FROM docs WHERE id = ?").run(id);
    }
    async removeByKey(key) {
        this.db.prepare("DELETE FROM docs WHERE key = ?").run(key);
    }
}
//# sourceMappingURL=sqlite.doc.repository.js.map