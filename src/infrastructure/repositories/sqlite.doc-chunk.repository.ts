import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { DocChunk, DocChunkMatch } from "../../domain/entities/doc-chunk.entity.js";
import type { DocChunkRepository } from "../../domain/repositories/doc-chunk.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
import { openSqliteDatabase } from "./sqlite.connection.js";
import { config } from "../../config.js";
import { MAX_VECTOR_DISTANCE, cosineDistance, significantWords } from "./knowledge-search.utils.js";
import { chunkText } from "./chunking.utils.js";

interface DocChunkRow {
  id: number;
  doc_key: string;
  chunk_index: number;
  content: string;
  created_at: string;
}

interface DocChunkVectorRow {
  doc_key: string;
  chunk_index: number;
  content: string;
  embedding: string;
  doc_title: string;
  doc_reference: string;
  doc_path: string;
  doc_tag: string;
}

function toDocChunk(row: DocChunkRow): DocChunk {
  return {
    id: row.id,
    docKey: row.doc_key,
    chunkIndex: row.chunk_index,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

function toDocChunkMatch(row: DocChunkVectorRow): DocChunkMatch {
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

function matchesAllWords(haystack: string, words: string[]): boolean {
  const lower = haystack.toLowerCase();
  return words.every((word) => lower.includes(word.toLowerCase()));
}

// Owns doc_vectors: chunking, embedding, and semantic search over doc content. Injected into
// SqliteDocRepository, which never touches doc_vectors directly.
export class SqliteDocChunkRepository implements DocChunkRepository {
  private readonly db: DatabaseSync;

  constructor(private readonly embedingService: EmbedingService) {
    this.db = openSqliteDatabase();
  }

  async insert(docKey: string, content: string): Promise<DocChunk[]> {
    const chunks = chunkText(content, config.chunking.maxChars, config.chunking.overlapChars);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));

    this.db.exec("BEGIN");
    try {
      const rows = this.insertChunkRows(docKey, chunks, embeddings);
      this.db.exec("COMMIT");
      return rows;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Semantic + literal search across chunk content, joined with docs for the metadata a match
  // needs (title/reference/path/tag) and to support the optional tag filter. Deliberately not
  // deduplicated per doc: several chunks from the same doc can legitimately be separate hits.
  async search(query: string, limit = 5, tag?: string): Promise<DocChunkMatch[]> {
    const embedding = await this.embedingService.generate(query);
    const words = significantWords(query);

    const conditions: string[] = [];
    const params: SQLInputValue[] = [];
    if (tag) {
      conditions.push("d.tag = ?");
      params.push(tag);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = this.db
      .prepare(
        `SELECT v.doc_key, v.chunk_index, v.content, v.embedding,
                d.title AS doc_title, d.doc_reference AS doc_reference, d.path AS doc_path, d.tag AS doc_tag
         FROM doc_vectors v
         JOIN docs d ON d.key = v.doc_key
         ${whereClause}`,
      )
      .all(...params) as unknown as DocChunkVectorRow[];

    const scored = rows.map((row) => {
      const distance = cosineDistance(embedding, JSON.parse(row.embedding) as number[]);
      const literalMatch = matchesAllWords(row.content, words);
      return { row, distance, literalMatch };
    });

    return scored
      .filter((entry) => entry.distance < MAX_VECTOR_DISTANCE || entry.literalMatch)
      .sort((a, b) => Number(b.literalMatch) - Number(a.literalMatch) || a.distance - b.distance)
      .slice(0, limit)
      .map((entry) => toDocChunkMatch(entry.row));
  }

  async update(docKey: string, content: string): Promise<DocChunk[]> {
    const chunks = chunkText(content, config.chunking.maxChars, config.chunking.overlapChars);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));

    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM doc_vectors WHERE doc_key = ?").run(docKey);
      const rows = this.insertChunkRows(docKey, chunks, embeddings);
      this.db.exec("COMMIT");
      return rows;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async remove(docKey: string): Promise<void> {
    this.db.prepare("DELETE FROM doc_vectors WHERE doc_key = ?").run(docKey);
  }

  private insertChunkRows(docKey: string, chunks: string[], embeddings: number[][]): DocChunk[] {
    const insert = this.db.prepare(
      `INSERT INTO doc_vectors (doc_key, chunk_index, content, embedding)
       VALUES (?, ?, ?, ?)
       RETURNING id, doc_key, chunk_index, content, created_at`,
    );

    const rows: DocChunk[] = [];
    for (let index = 0; index < chunks.length; index++) {
      const row = insert.get(docKey, index, chunks[index]!, JSON.stringify(embeddings[index]!)) as unknown as
        | DocChunkRow
        | undefined;
      if (row) {
        rows.push(toDocChunk(row));
      }
    }
    return rows;
  }
}
