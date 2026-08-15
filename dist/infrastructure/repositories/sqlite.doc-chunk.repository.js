import { openSqliteDatabase } from "./sqlite.connection.js";
import { config } from "../../config.js";
import { MAX_VECTOR_DISTANCE, cosineDistance, significantWords } from "./knowledge-search.utils.js";
import { chunkText } from "./chunking.utils.js";
function toDocChunk(row) {
    return {
        id: row.id,
        docKey: row.doc_key,
        chunkIndex: row.chunk_index,
        content: row.content,
        createdAt: new Date(row.created_at),
    };
}
function toDocChunkMatch(row) {
    return {
        docKey: row.doc_key,
        chunkIndex: row.chunk_index,
        content: row.content,
        docTitle: row.doc_title,
        docReference: row.doc_reference,
        docPath: row.doc_path,
        docTag: row.doc_tag,
    };
}
function matchesAllWords(haystack, words) {
    const lower = haystack.toLowerCase();
    return words.every((word) => lower.includes(word.toLowerCase()));
}
// Owns doc_vectors: chunking, embedding, and semantic search over doc content. Injected into
// SqliteDocRepository, which never touches doc_vectors directly.
export class SqliteDocChunkRepository {
    embedingService;
    db;
    constructor(embedingService) {
        this.embedingService = embedingService;
        this.db = openSqliteDatabase();
    }
    async insert(docKey, content) {
        const chunks = chunkText(content, config.chunking.maxChars, config.chunking.overlapChars);
        const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
        this.db.exec("BEGIN");
        try {
            const rows = this.insertChunkRows(docKey, chunks, embeddings);
            this.db.exec("COMMIT");
            return rows;
        }
        catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }
    }
    // Semantic + literal search across chunk content, joined with docs for the metadata a match
    // needs (title/reference/path/tag) and to support the optional tag filter. Deliberately not
    // deduplicated per doc: several chunks from the same doc can legitimately be separate hits.
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
            .prepare(`SELECT v.doc_key, v.chunk_index, v.content, v.embedding,
                d.title AS doc_title, d.doc_reference AS doc_reference, d.path AS doc_path, d.tag AS doc_tag
         FROM doc_vectors v
         JOIN docs d ON d.key = v.doc_key
         ${whereClause}`)
            .all(...params);
        const scored = rows.map((row) => {
            const distance = cosineDistance(embedding, JSON.parse(row.embedding));
            const literalMatch = matchesAllWords(row.content, words);
            return { row, distance, literalMatch };
        });
        return scored
            .filter((entry) => entry.distance < MAX_VECTOR_DISTANCE || entry.literalMatch)
            .sort((a, b) => Number(b.literalMatch) - Number(a.literalMatch) || a.distance - b.distance)
            .slice(0, limit)
            .map((entry) => toDocChunkMatch(entry.row));
    }
    async update(docKey, content) {
        const chunks = chunkText(content, config.chunking.maxChars, config.chunking.overlapChars);
        const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
        this.db.exec("BEGIN");
        try {
            this.db.prepare("DELETE FROM doc_vectors WHERE doc_key = ?").run(docKey);
            const rows = this.insertChunkRows(docKey, chunks, embeddings);
            this.db.exec("COMMIT");
            return rows;
        }
        catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }
    }
    async remove(docKey) {
        this.db.prepare("DELETE FROM doc_vectors WHERE doc_key = ?").run(docKey);
    }
    insertChunkRows(docKey, chunks, embeddings) {
        const insert = this.db.prepare(`INSERT INTO doc_vectors (doc_key, chunk_index, content, embedding)
       VALUES (?, ?, ?, ?)
       RETURNING id, doc_key, chunk_index, content, created_at`);
        const rows = [];
        for (let index = 0; index < chunks.length; index++) {
            const row = insert.get(docKey, index, chunks[index], JSON.stringify(embeddings[index]));
            if (row) {
                rows.push(toDocChunk(row));
            }
        }
        return rows;
    }
}
//# sourceMappingURL=sqlite.doc-chunk.repository.js.map