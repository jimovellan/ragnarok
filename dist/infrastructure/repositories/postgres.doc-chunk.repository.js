import pg from "pg";
import { config } from "../../config.js";
import { MAX_VECTOR_DISTANCE, significantWords } from "./knowledge-search.utils.js";
import { chunkText } from "./chunking.utils.js";
function toDocChunk(row) {
    return {
        id: row.id,
        docKey: row.doc_key,
        chunkIndex: row.chunk_index,
        content: row.content,
        createdAt: row.created_at,
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
// Wraps each significant query word in SQL ILIKE wildcards for use with ILIKE ALL/ANY.
function wordPatterns(query) {
    return significantWords(query).map((word) => `%${word}%`);
}
// Owns doc_vectors: chunking, embedding, and semantic search over doc content. Injected into
// PostgresDocRepository, which never touches doc_vectors directly.
export class PostgresDocChunkRepository {
    embedingService;
    pool;
    constructor(embedingService) {
        this.embedingService = embedingService;
        this.pool = new pg.Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.database,
        });
    }
    async insert(docKey, content) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const rows = await this.insertChunks(client, docKey, content);
            await client.query("COMMIT");
            return rows;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Semantic + literal search across chunk content, joined with docs for the metadata a match
    // needs (title/reference/path/tag) and to support the optional tag filter. Deliberately not
    // deduplicated per doc: several chunks from the same doc can legitimately be separate hits.
    async search(query, limit = 5, tag) {
        const embedding = await this.embedingService.generate(query);
        const params = [`[${embedding.join(",")}]`, wordPatterns(query)];
        const literalMatch = "v.content ILIKE ALL($2)";
        const conditions = [`(v.embedding <=> $1::vector < ${MAX_VECTOR_DISTANCE} OR ${literalMatch})`];
        if (tag) {
            params.push(tag);
            conditions.push(`d.tag = $${params.length}`);
        }
        params.push(limit);
        const result = await this.pool.query(`SELECT v.doc_key, v.chunk_index, v.content,
              d.title AS doc_title, d.doc_reference AS doc_reference, d.path AS doc_path, d.tag AS doc_tag
       FROM doc_vectors v
       JOIN docs d ON d.key = v.doc_key
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${literalMatch} DESC, v.embedding <=> $1::vector
       LIMIT $${params.length}`, params);
        return result.rows.map(toDocChunkMatch);
    }
    async update(docKey, content) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM doc_vectors WHERE doc_key = $1", [docKey]);
            const rows = await this.insertChunks(client, docKey, content);
            await client.query("COMMIT");
            return rows;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async remove(docKey) {
        await this.pool.query("DELETE FROM doc_vectors WHERE doc_key = $1", [docKey]);
    }
    async insertChunks(client, docKey, content) {
        const chunks = chunkText(content, config.chunking.maxChars, config.chunking.overlapChars);
        const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
        const rows = [];
        for (let index = 0; index < chunks.length; index++) {
            const result = await client.query(`INSERT INTO doc_vectors (doc_key, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4::vector)
         RETURNING id, doc_key, chunk_index, content, created_at`, [docKey, index, chunks[index], `[${embeddings[index].join(",")}]`]);
            const row = result.rows[0];
            if (row) {
                rows.push(toDocChunk(row));
            }
        }
        return rows;
    }
}
//# sourceMappingURL=postgres.doc-chunk.repository.js.map