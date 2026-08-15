import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Doc, DocSummary } from "../../domain/entities/doc.entity.js";
import type { DocChanges, DocMetadata, DocRepository } from "../../domain/repositories/doc.repository.js";
import type { DocChunkRepository } from "../../domain/repositories/doc-chunk.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
import { config } from "../../config.js";
import { MAX_VECTOR_DISTANCE, significantWords } from "./knowledge-search.utils.js";

interface DocRow {
  id: number;
  key: string;
  doc_reference: string;
  path: string;
  title: string;
  summary: string;
  tag: string;
  created_at: Date;
  updated_at: Date;
}

const RETURNING_COLUMNS = "id, key, doc_reference, path, title, summary, tag, created_at, updated_at";

const UPDATABLE_COLUMN_BY_FIELD: Record<keyof DocMetadata, string> = {
  docReference: "doc_reference",
  path: "path",
  title: "title",
  summary: "summary",
  tag: "tag",
};

function toDoc(row: DocRow): Doc {
  return {
    id: row.id,
    key: row.key,
    docReference: row.doc_reference,
    path: row.path,
    title: row.title,
    summary: row.summary,
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDocSummary(row: DocRow): DocSummary {
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

// Wraps each significant query word in SQL ILIKE wildcards for use with ILIKE ALL/ANY.
function wordPatterns(query: string): string[] {
  return significantWords(query).map((word) => `%${word}%`);
}

function buildSetClause(changes: DocChanges, params: unknown[]): string {
  const assignments: string[] = [];

  for (const field of Object.keys(UPDATABLE_COLUMN_BY_FIELD) as (keyof DocMetadata)[]) {
    const value = changes[field];
    if (value !== undefined) {
      params.push(value);
      assignments.push(`${UPDATABLE_COLUMN_BY_FIELD[field]} = $${params.length}`);
    }
  }

  assignments.push("updated_at = now()");
  return assignments.join(", ");
}

// The docs table itself never stores content — that lives entirely in doc_vectors, owned by
// DocChunkRepository. This repository only manages doc metadata and delegates chunking/embedding
// to the injected DocChunkRepository whenever content is created or changed.
export class PostgresDocRepository implements DocRepository {
  private readonly pool: pg.Pool;

  constructor(
    private readonly embedingService: EmbedingService,
    private readonly docChunkRepository: DocChunkRepository,
  ) {
    this.pool = new pg.Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
    });
  }

  async create(doc: DocMetadata & { content: string }): Promise<Doc> {
    const key = randomUUID();

    const result = await this.pool.query<DocRow>(
      `INSERT INTO docs (key, doc_reference, path, title, summary, tag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${RETURNING_COLUMNS}`,
      [key, doc.docReference, doc.path, doc.title, doc.summary, doc.tag],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create doc entry");
    }

    try {
      await this.docChunkRepository.insert(key, doc.content);
    } catch (error) {
      // Don't leave a doc behind with no content chunks if embedding/inserting them failed.
      await this.pool.query("DELETE FROM docs WHERE key = $1", [key]);
      throw error;
    }

    return toDoc(row);
  }

  // Hybrid search over each doc's chunks (see PostgresDocChunkRepository.search for the same
  // calibration used by knowledge search), collapsed to one row per doc via DISTINCT ON.
  async search(query: string, limit = 5, tag?: string): Promise<DocSummary[]> {
    const embedding = await this.embedingService.generate(query);
    const params: unknown[] = [`[${embedding.join(",")}]`, wordPatterns(query)];
    const literalMatch = "(d.title || ' ' || d.tag || ' ' || d.summary || ' ' || v.content) ILIKE ALL($2)";
    const conditions = [`(v.embedding <=> $1::vector < ${MAX_VECTOR_DISTANCE} OR ${literalMatch})`];

    if (tag) {
      params.push(tag);
      conditions.push(`d.tag = $${params.length}`);
    }

    params.push(limit);

    const result = await this.pool.query<DocRow>(
      `SELECT id, key, doc_reference, path, title, summary, tag FROM (
         SELECT DISTINCT ON (d.key) d.id, d.key, d.doc_reference, d.path, d.title, d.summary, d.tag,
                v.embedding <=> $1::vector AS distance,
                ${literalMatch} AS literal_match
         FROM docs d
         JOIN doc_vectors v ON v.doc_key = d.key
         WHERE ${conditions.join(" AND ")}
         ORDER BY d.key, v.embedding <=> $1::vector
       ) best
       ORDER BY literal_match DESC, distance
       LIMIT $${params.length}`,
      params,
    );

    return result.rows.map(toDocSummary);
  }

  async listTags(): Promise<string[]> {
    const result = await this.pool.query<{ tag: string }>(
      "SELECT DISTINCT tag FROM docs WHERE tag IS NOT NULL ORDER BY tag",
    );
    return result.rows.map((row) => row.tag);
  }

  async getById(id: number): Promise<Doc | null> {
    const result = await this.pool.query<DocRow>(`SELECT ${RETURNING_COLUMNS} FROM docs WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? toDoc(row) : null;
  }

  async getByKey(key: string): Promise<Doc | null> {
    const result = await this.pool.query<DocRow>(`SELECT ${RETURNING_COLUMNS} FROM docs WHERE key = $1`, [key]);
    const row = result.rows[0];
    return row ? toDoc(row) : null;
  }

  async updateById(id: number, changes: DocChanges): Promise<Doc> {
    const params: unknown[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(id);

    return this.updateAndRefreshChunks(
      `UPDATE docs SET ${setClause} WHERE id = $${params.length} RETURNING ${RETURNING_COLUMNS}`,
      params,
      changes,
      `Doc with id ${id} not found`,
    );
  }

  async updateByKey(key: string, changes: DocChanges): Promise<Doc> {
    const params: unknown[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(key);

    return this.updateAndRefreshChunks(
      `UPDATE docs SET ${setClause} WHERE key = $${params.length} RETURNING ${RETURNING_COLUMNS}`,
      params,
      changes,
      `Doc with key ${key} not found`,
    );
  }

  private async updateAndRefreshChunks(
    updateSql: string,
    params: unknown[],
    changes: DocChanges,
    notFoundMessage: string,
  ): Promise<Doc> {
    const result = await this.pool.query<DocRow>(updateSql, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error(notFoundMessage);
    }

    if (changes.content !== undefined) {
      await this.docChunkRepository.update(row.key, changes.content);
    }

    return toDoc(row);
  }

  // No explicit doc_vectors cleanup needed: doc_vectors.doc_key has ON DELETE CASCADE.
  async removeById(id: number): Promise<void> {
    await this.pool.query("DELETE FROM docs WHERE id = $1", [id]);
  }

  async removeByKey(key: string): Promise<void> {
    await this.pool.query("DELETE FROM docs WHERE key = $1", [key]);
  }
}
