import { randomUUID } from "node:crypto";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { Knowledge, KnowledgeSummary } from "../../domain/entities/knowledge.entity.js";
import type { KnowledgeChanges, KnowledgeRepository } from "../../domain/repositories/knowledge.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
import { openSqliteDatabase } from "./sqlite.connection.js";
import { MAX_VECTOR_DISTANCE, cosineDistance, significantWords } from "./knowledge-search.utils.js";
import { buildChunkTexts } from "./chunking.utils.js";
import { config } from "../../config.js";

interface KnowledgeRow {
  id: number;
  key: string;
  title: string;
  tag: string;
  namespace: string;
  summary: string;
  content: string;
  reference: string;
  store_content: number;
  version: number;
  active: number;
  created_at: string;
  updated_at: string;
}

interface KnowledgeVectorRow extends KnowledgeRow {
  embedding: string;
}

const COLUMNS =
  "id, key, title, tag, namespace, summary, content, reference, store_content, version, active, created_at, updated_at";

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
    storeContent: row.store_content === 1,
    version: row.version,
    active: row.active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toKnowledgeSummary(row: KnowledgeRow): KnowledgeSummary {
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

function matchesAllWords(haystack: string, words: string[]): boolean {
  const lower = haystack.toLowerCase();
  return words.every((word) => lower.includes(word.toLowerCase()));
}

function buildSetClause(changes: KnowledgeChanges, params: SQLInputValue[]): string {
  const assignments: string[] = [];

  for (const field of Object.keys(UPDATABLE_COLUMN_BY_FIELD) as (keyof KnowledgeChanges)[]) {
    const value = changes[field];
    if (value !== undefined) {
      const column = UPDATABLE_COLUMN_BY_FIELD[field];
      const isBooleanColumn = column === "active" || column === "store_content";
      params.push((isBooleanColumn ? (value ? 1 : 0) : value) as SQLInputValue);
      assignments.push(`${column} = ?`);
    }
  }

  assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  return assignments.join(", ");
}

// SQLite has no pgvector equivalent: embeddings are stored as JSON text and cosine distance
// is computed in JS (see knowledge-search.utils.ts) instead of in SQL. Fine for the small,
// single-file datasets this engine is meant for; PostgresKnowledgeRepository is the scalable path.
export class SqliteKnowledgeRepository implements KnowledgeRepository {
  private readonly db: DatabaseSync;

  constructor(private readonly embedingService: EmbedingService) {
    this.db = openSqliteDatabase();
  }

  async create(knowledge: Omit<Knowledge, "id" | "key" | "createdAt" | "updatedAt">): Promise<Knowledge> {
    const key = randomUUID();
    // Chunking always uses the given content, even when storeContent is false and it won't be
    // persisted.
    const chunks = buildChunkTexts(knowledge, config.chunking.maxChars, config.chunking.overlapChars);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedingService.generate(chunk)));
    const contentToStore = knowledge.storeContent ? knowledge.content : "";

    this.db.exec("BEGIN");
    try {
      const row = this.db
        .prepare(
          `INSERT INTO knowledge (key, title, tag, namespace, summary, content, reference, store_content, version, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING ${COLUMNS}`,
        )
        .get(
          key,
          knowledge.title,
          knowledge.tag,
          knowledge.namespace,
          knowledge.summary,
          contentToStore,
          knowledge.reference,
          knowledge.storeContent ? 1 : 0,
          knowledge.version,
          knowledge.active ? 1 : 0,
        ) as unknown as KnowledgeRow | undefined;

      if (!row) {
        throw new Error("Failed to create knowledge entry");
      }

      const insertVector = this.db.prepare("INSERT INTO knowledge_vectors (knowledge_key, embedding) VALUES (?, ?)");
      for (const embedding of embeddings) {
        insertVector.run(key, JSON.stringify(embedding));
      }

      this.db.exec("COMMIT");
      return toKnowledge(row);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async search(query: string, limit = 5, tag?: string, namespace?: string): Promise<KnowledgeSummary[]> {
    const embedding = await this.embedingService.generate(query);
    const words = significantWords(query);

    const conditions = ["k.active = 1"];
    const params: SQLInputValue[] = [];
    if (tag) {
      conditions.push("k.tag = ?");
      params.push(tag);
    }
    if (namespace) {
      conditions.push("k.namespace = ?");
      params.push(namespace);
    }

    const rows = this.db
      .prepare(
        `SELECT ${COLUMNS.split(", ").map((c) => `k.${c}`).join(", ")}, v.embedding
         FROM knowledge k
         JOIN knowledge_vectors v ON v.knowledge_key = k.key
         WHERE ${conditions.join(" AND ")}`,
      )
      .all(...params) as unknown as KnowledgeVectorRow[];

    const scored = rows.map((row) => {
      const distance = cosineDistance(embedding, JSON.parse(row.embedding) as number[]);
      const literalMatch = matchesAllWords(`${row.title} ${row.tag} ${row.summary} ${row.content}`, words);
      return { row, distance, literalMatch };
    });

    // A chunked entry has one knowledge_vectors row per chunk, so `scored` can contain several
    // entries per key; keep only the closest chunk per key before ranking entries against
    // each other.
    const bestByKey = new Map<string, (typeof scored)[number]>();
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

  async listNamespaces(): Promise<string[]> {
    const rows = this.db
      .prepare("SELECT DISTINCT namespace FROM knowledge WHERE active = 1 AND namespace IS NOT NULL ORDER BY namespace")
      .all() as unknown as { namespace: string }[];
    return rows.map((row) => row.namespace);
  }

  async listTags(): Promise<string[]> {
    const rows = this.db
      .prepare("SELECT DISTINCT tag FROM knowledge WHERE active = 1 AND tag IS NOT NULL ORDER BY tag")
      .all() as unknown as { tag: string }[];
    return rows.map((row) => row.tag);
  }

  async getById(id: number): Promise<Knowledge | null> {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM knowledge WHERE id = ?`).get(id) as unknown as
      | KnowledgeRow
      | undefined;
    return row ? toKnowledge(row) : null;
  }

  async getByKey(key: string): Promise<Knowledge | null> {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM knowledge WHERE key = ?`).get(key) as unknown as
      | KnowledgeRow
      | undefined;
    return row ? toKnowledge(row) : null;
  }

  async updateById(id: number, changes: KnowledgeChanges): Promise<Knowledge> {
    const params: SQLInputValue[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(id);

    return this.updateAndRefreshEmbedding(
      `UPDATE knowledge SET ${setClause} WHERE id = ? RETURNING ${COLUMNS}`,
      params,
      changes,
      `Knowledge with id ${id} not found`,
    );
  }

  async updateByKey(key: string, changes: KnowledgeChanges): Promise<Knowledge> {
    const params: SQLInputValue[] = [];
    const setClause = buildSetClause(changes, params);
    params.push(key);

    return this.updateAndRefreshEmbedding(
      `UPDATE knowledge SET ${setClause} WHERE key = ? RETURNING ${COLUMNS}`,
      params,
      changes,
      `Knowledge with key ${key} not found`,
    );
  }

  private async updateAndRefreshEmbedding(
    updateSql: string,
    params: SQLInputValue[],
    changes: KnowledgeChanges,
    notFoundMessage: string,
  ): Promise<Knowledge> {
    const affectsEmbedding = changes.title !== undefined || changes.summary !== undefined || changes.content !== undefined;

    this.db.exec("BEGIN");
    try {
      let row = this.db.prepare(updateSql).get(...params) as unknown as KnowledgeRow | undefined;
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
          .get(row.key) as unknown as KnowledgeRow;
      }

      this.db.exec("COMMIT");
      return toKnowledge(row);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async removeById(id: number): Promise<void> {
    this.db.prepare("DELETE FROM knowledge WHERE id = ?").run(id);
  }

  async removeByKey(key: string): Promise<void> {
    this.db.prepare("DELETE FROM knowledge WHERE key = ?").run(key);
  }
}
