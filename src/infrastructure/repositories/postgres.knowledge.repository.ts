import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Knowledge, KnowledgeSummary } from "../../domain/entities/knowledge.entity.js";
import type { KnowledgeChanges, KnowledgeRepository } from "../../domain/repositories/knowledge.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
import { config } from "../../config.js";
import { MAX_VECTOR_DISTANCE, significantWords } from "./knowledge-search.utils.js";
import { buildChunkTexts } from "./chunking.utils.js";

interface KnowledgeRow {
  id: number;
  key: string;
  title: string;
  tag: string;
  namespace: string;
  summary: string;
  content: string;
  reference: string;
  store_content: boolean;
  version: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgeSummaryRow {
  id: number;
  key: string;
  title: string;
  tag: string;
  namespace: string;
  summary: string;
  reference: string;
}

const RETURNING_COLUMNS =
  "id, key, title, tag, namespace, summary, content, reference, store_content, version, active, created_at, updated_at";
// Search only returns the fields the UI needs to list results; the full record is fetched via getById/getByKey.
const SEARCH_COLUMNS = "k.id, k.key, k.title, k.tag, k.namespace, k.summary, k.reference";

const UPDATABLE_COLUMN_BY_FIELD: Record<keyof KnowledgeChanges, string> = {
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

function toKnowledge(row: KnowledgeRow): Knowledge {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    tag: row.tag,
    namespace: row.namespace,
    summary: row.summary,
    content: row.content,
    reference: row.reference,
    storeContent: row.store_content,
    version: row.version,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Wraps each significant query word in SQL ILIKE wildcards for use with ILIKE ALL/ANY.
function wordPatterns(query: string): string[] {
  return significantWords(query).map((word) => `%${word}%`);
}

function toKnowledgeSummary(row: KnowledgeSummaryRow): KnowledgeSummary {
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

function buildSetClause(changes: KnowledgeChanges, params: unknown[]): string {
  const assignments: string[] = [];

  for (const field of Object.keys(UPDATABLE_COLUMN_BY_FIELD) as (keyof KnowledgeChanges)[]) {
    const value = changes[field];
    if (value !== undefined) {
      params.push(value);
      assignments.push(`${UPDATABLE_COLUMN_BY_FIELD[field]} = $${params.length}`);
    }
  }

  assignments.push("updated_at = now()");
  return assignments.join(", ");
}

export class PostgresKnowledgeRepository implements KnowledgeRepository {
  private readonly pool: pg.Pool;

  constructor(private readonly embedingService: EmbedingService) {
    this.pool = new pg.Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
    });
  }

  // Implement the methods defined in the KnowledgeRepository interface
  async create(knowledge: Omit<Knowledge, "id" | "key" | "createdAt" | "updatedAt">): Promise<Knowledge> {
    // Generate a unique key for the knowledge entry
    const key = randomUUID();

    // Large content is split into overlapping chunks so each embedding stays within the
    // model's input limits; short content comes back as a single chunk. Chunking always uses
    // the given content, even when storeContent is false and it won't be persisted.
    const chunks = buildChunkTexts(knowledge, config.chunking.maxChars, config.chunking.overlapChars);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
    const contentToStore = knowledge.storeContent ? knowledge.content : "";

    // Start a transaction to ensure both inserts succeed or fail together
    const client = await this.pool.connect();

    try {
      // Start a transaction
      await client.query("BEGIN");

      // Insert the knowledge entry into the knowledge table
      const result = await client.query<KnowledgeRow>(
        `INSERT INTO knowledge (key, title, tag, namespace, summary, content, reference, store_content, version, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${RETURNING_COLUMNS}`,
        [
          key,
          knowledge.title,
          knowledge.tag,
          knowledge.namespace,
          knowledge.summary,
          contentToStore,
          knowledge.reference,
          knowledge.storeContent,
          knowledge.version,
          knowledge.active,
        ],
      );

      // Check if the insert was successful
      const row = result.rows[0];
      if (!row) {
        throw new Error("Failed to create knowledge entry");
      }

      // Insert one embedding row per chunk into the knowledge_vectors table
      for (const embedding of embeddings) {
        await client.query(
          `INSERT INTO knowledge_vectors (knowledge_key, embedding) VALUES ($1, $2::vector)`,
          [key, `[${embedding.join(",")}]`],
        );
      }

      // Commit the transaction
      await client.query("COMMIT");

      // Return the created knowledge entry
      return toKnowledge(row);

    } catch (error) {
      // Rollback the transaction in case of an error
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Hybrid search: vector similarity OR a literal match requiring every significant query word to be
  // present (across title+tag+summary+content combined), so a query like "lua" is always found even
  // when its embedding lands far away. Matching ALL words instead of ANY avoids a single generic word
  // (e.g. "control" in "control de plagas") pulling in every unrelated row that happens to contain it.
  // Literal matches are ranked first — otherwise a real keyword hit can get crowded out of the LIMIT
  // window by unrelated rows that merely happen to sit closer in embedding space.
  async search(query: string, limit = 5, tag?: string, namespace?: string): Promise<KnowledgeSummary[]> {
    // Generate the embedding for the search query
    const embedding = await this.embedingService.generate(query);
    const params: unknown[] = [`[${embedding.join(",")}]`, wordPatterns(query)];
    const literalMatch = "(k.title || ' ' || k.tag || ' ' || k.summary || ' ' || k.content) ILIKE ALL($2)";
    const conditions = ["k.active = true", `(v.embedding <=> $1::vector < ${MAX_VECTOR_DISTANCE} OR ${literalMatch})`];

    // Add conditions for tag and namespace if they are provided
    if (tag) {
      params.push(tag);
      conditions.push(`k.tag = $${params.length}`);
    }
    // Add condition for namespace if it is provided
    if (namespace) {
      params.push(namespace);
      conditions.push(`k.namespace = $${params.length}`);
    }

    // Add the limit parameter to the query
    params.push(limit);

    // A chunked entry has one knowledge_vectors row per chunk, so the join can return several
    // rows per key. DISTINCT ON (k.key) collapses that to each entry's single closest chunk
    // before the outer ORDER BY/LIMIT ranks entries against each other.
    const result = await this.pool.query<KnowledgeSummaryRow>(
      `SELECT id, key, title, tag, namespace, summary FROM (
         SELECT DISTINCT ON (k.key) ${SEARCH_COLUMNS},
                v.embedding <=> $1::vector AS distance,
                ${literalMatch} AS literal_match
         FROM knowledge k
         JOIN knowledge_vectors v ON v.knowledge_key = k.key
         WHERE ${conditions.join(" AND ")}
         ORDER BY k.key, v.embedding <=> $1::vector
       ) best
       ORDER BY literal_match DESC, distance
       LIMIT $${params.length}`,
      params,
    );

    return result.rows.map(toKnowledgeSummary);
  }

  async listNamespaces(): Promise<string[]> {
    const result = await this.pool.query<{ namespace: string }>(
      "SELECT DISTINCT namespace FROM knowledge WHERE active = true AND namespace IS NOT NULL ORDER BY namespace",
    );
    return result.rows.map((row) => row.namespace);
  }

  async listTags(): Promise<string[]> {
    const result = await this.pool.query<{ tag: string }>(
      "SELECT DISTINCT tag FROM knowledge WHERE active = true AND tag IS NOT NULL ORDER BY tag",
    );
    return result.rows.map((row) => row.tag);
  }

  async getById(id: number): Promise<Knowledge | null> {
    const result = await this.pool.query<KnowledgeRow>(
      `SELECT ${RETURNING_COLUMNS} FROM knowledge WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? toKnowledge(row) : null;
  }

  async getByKey(key: string): Promise<Knowledge | null> {
    const result = await this.pool.query<KnowledgeRow>(
      `SELECT ${RETURNING_COLUMNS} FROM knowledge WHERE key = $1`,
      [key],
    );

    const row = result.rows[0];
    return row ? toKnowledge(row) : null;
  }

  async updateById(id: number, changes: KnowledgeChanges): Promise<Knowledge> {
    const params: unknown[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(id);

    return this.updateAndRefreshEmbedding(
      `UPDATE knowledge SET ${setClause} WHERE id = $${params.length} RETURNING ${RETURNING_COLUMNS}`,
      params,
      changes,
      `Knowledge with id ${id} not found`,
    );
  }

  async updateByKey(key: string, changes: KnowledgeChanges): Promise<Knowledge> {
    const params: unknown[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(key);

    return this.updateAndRefreshEmbedding(
      `UPDATE knowledge SET ${setClause} WHERE key = $${params.length} RETURNING ${RETURNING_COLUMNS}`,
      params,
      changes,
      `Knowledge with key ${key} not found`,
    );
  }

  // Re-embeds title+summary+content and keeps knowledge_vectors in sync whenever one of them changes.
  private async updateAndRefreshEmbedding(
    updateSql: string,
    params: unknown[],
    changes: KnowledgeChanges,
    notFoundMessage: string,
  ): Promise<Knowledge> {
    const affectsEmbedding = changes.title !== undefined || changes.summary !== undefined || changes.content !== undefined;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query<KnowledgeRow>(updateSql, params);
      let row = result.rows[0];
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

        await client.query(`DELETE FROM knowledge_vectors WHERE knowledge_key = $1`, [row.key]);
        for (const chunkEmbedding of embeddings) {
          await client.query(
            `INSERT INTO knowledge_vectors (knowledge_key, embedding) VALUES ($1, $2::vector)`,
            [row.key, `[${chunkEmbedding.join(",")}]`],
          );
        }
      }

      // storeContent = false means content is never persisted: blank it out now that it's
      // been used above (if this update touched the embedding) to compute chunk embeddings.
      if (!row.store_content && row.content !== "") {
        const cleared = await client.query<KnowledgeRow>(
          `UPDATE knowledge SET content = '' WHERE key = $1 RETURNING ${RETURNING_COLUMNS}`,
          [row.key],
        );
        row = cleared.rows[0] ?? row;
      }

      await client.query("COMMIT");
      return toKnowledge(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async removeById(id: number): Promise<void> {
    await this.pool.query("DELETE FROM knowledge WHERE id = $1", [id]);
  }

  async removeByKey(key: string): Promise<void> {
    await this.pool.query("DELETE FROM knowledge WHERE key = $1", [key]);
  }
}
